import {
  LiveResultInfo,
  LogLevels,
  SeededResult,
  WatchedQuery,
  WatchedQueryListener,
  WatchedQueryListenerEvent,
  WatchedQueryOptions,
  WatchedQueryPluginContext,
  WatchedQueryState
} from '@powersync/common';
import { MetaBaseObserver } from '../../utils/MetaBaseObserver.js';
import {
  ActiveQueryHooks,
  mergeExtensions,
  WatchedQueryPluginRegistry
} from '../plugins/WatchedQueryPluginRegistry.js';
import { querySignature } from '../plugins/signature.js';
import { BasePowerSyncDatabase } from '../BasePowerSyncDatabase.js';

/**
 * @internal
 */
export interface AbstractQueryProcessorOptions<Data, Settings extends WatchedQueryOptions = WatchedQueryOptions> {
  db: BasePowerSyncDatabase;
  watchOptions: Settings;
  placeholderData: Data;
  /**
   * Plugin options declared on the query definition this processor was built from.
   * Merged under (and overridden by) the per-watch `extensions` on every settings
   * change, so a definition-level extension survives `updateSettings()`.
   */
  defaultExtensions?: Record<string, unknown>;
}

/**
 * @internal
 */
export interface LinkQueryOptions<Data, Settings extends WatchedQueryOptions = WatchedQueryOptions> {
  abortSignal: AbortSignal;
  settings: Settings;
}

type MutableDeep<T> =
  T extends ReadonlyArray<infer U>
    ? U[] // convert readonly arrays to mutable arrays
    : T;

/**
 * @internal Mutable version of {@link WatchedQueryState}.
 * This is used internally to allow updates to the state.
 */
export type MutableWatchedQueryState<Data> = {
  -readonly [P in keyof WatchedQueryState<Data>]: MutableDeep<WatchedQueryState<Data>[P]>;
};

type WatchedQueryProcessorListener<Data> = WatchedQueryListener<Data>;

/**
 * Performs underlying watching and yields a stream of results.
 * @internal
 */
export abstract class AbstractQueryProcessor<
  Data = unknown[],
  Settings extends WatchedQueryOptions = WatchedQueryOptions
>
  extends MetaBaseObserver<WatchedQueryProcessorListener<Data>>
  implements WatchedQuery<Data, Settings>
{
  readonly state: WatchedQueryState<Data>;

  protected abortController: AbortController;
  protected initialized: Promise<void>;
  protected _closed: boolean;
  protected disposeListeners: (() => void) | null;

  /** This query's plugin hooks, or null when no registry / no interested plugin. */
  private pluginHooks: ActiveQueryHooks[] | null = null;
  /** True once a live result has reached the state. Gates every seed. */
  private hasLiveResult = false;
  /**
   * True once a plugin-seeded result has been adopted for the current hook generation.
   * Enforces first-adopted-wins across `trySeed` calls (two plugins, or the same plugin
   * calling `seed()` twice) — without this, a later seed would silently overwrite an
   * already-adopted one even though `hasLiveResult`/`_closed`/`signal.aborted` are all
   * still false. Reset alongside `hasLiveResult` whenever hooks are rebound.
   */
  private hasAdoptedSeed = false;
  /** Set while hooks were deferred because the registry had not opened yet. */
  private hooksDeferred = false;
  /**
   * The query signature the current hook generation was created for, or undefined when
   * there is no generation. A re-link whose signature is unchanged (the `schemaChanged`
   * self-re-link, or an `updateSettings()` that only touches throttling) rebinds hooks
   * but must NOT reopen the seeding guards — doing so lets a plugin repaint stale
   * seeded data over live data that is already on screen.
   */
  private generationSignature: string | undefined;

  get closed() {
    return this._closed;
  }

  constructor(protected options: AbstractQueryProcessorOptions<Data, Settings>) {
    super();
    this.abortController = new AbortController();
    this._closed = false;

    const registry = this.pluginRegistry;
    if (registry?.hasPlugins) {
      if (registry.isOpen) {
        this.createHookGeneration(registry);
      } else {
        // Query constructed before the database finished initializing — plugins may
        // assume onDatabaseOpen ran first (spec rule 8), so defer creation to init().
        this.hooksDeferred = true;
      }
    }

    this.state = this.constructInitialState();
    this.disposeListeners = null;
    this.initialized = this.init(this.abortController.signal);
  }

  protected constructInitialState(): WatchedQueryState<Data> {
    const seed = this.consultInitialSeed();
    if (seed) {
      // First-adopted-wins applies to the synchronous seed too: without this, an async
      // seed that resolves later (an older, slower plugin read) would overwrite the
      // newer rows already painted here.
      this.hasAdoptedSeed = true;
      return {
        isLoading: false,
        isFetching: this.reportFetching,
        error: null,
        lastUpdated: new Date(),
        data: seed.data as Data,
        source: seed.source,
        sourceMeta: seed.sourceMeta ?? null
      };
    }
    return {
      isLoading: true,
      isFetching: this.reportFetching, // Only set to true if we will report updates in future
      error: null,
      lastUpdated: null,
      data: this.options.placeholderData,
      source: 'placeholder',
      sourceMeta: null
    };
  }

  protected get reportFetching() {
    return this.options.watchOptions.reportFetching ?? true;
  }

  private get pluginRegistry(): WatchedQueryPluginRegistry | undefined {
    // Optional at runtime: the processor is also exercised against minimal database
    // stubs that carry no registry at all.
    return this.options.db?.pluginRegistry;
  }

  /**
   * Definition-level extensions merged under the current watch-level ones. Recomputed
   * on every settings change — `updateSettings()` replaces `watchOptions` wholesale, so
   * a merge done once at construction would silently drop the definition's options.
   */
  private resolveExtensions(): Record<string, unknown> | undefined {
    return mergeExtensions(this.options.defaultExtensions, this.options.watchOptions.extensions);
  }

  private buildPluginContext(): WatchedQueryPluginContext {
    let compiled = { sql: '', parameters: [] as unknown[] };
    try {
      // `Settings` (constrained only to `WatchedQueryOptions`) does not itself declare
      // `query` — every concrete settings type (WatchedQuerySettings,
      // DifferentialWatchedQuerySettings, ...) does.
      compiled = (this.options.watchOptions as any).query.compile() as typeof compiled;
    } catch {
      // A query that cannot compile yet still runs; plugins just see an empty signature.
    }
    return {
      signature: querySignature(compiled),
      compiled,
      dataIsArray: Array.isArray(this.options.placeholderData),
      extensionOptions: undefined, // per-plugin value filled in by WatchedQueryPluginRegistry.createHooks
      db: this.options.db
    };
  }

  /**
   * Creates this generation's hooks and records the signature they were built for.
   *
   * @returns true when that signature differs from the previous generation's — i.e.
   * this is a genuinely different query and the seeding guards may be reopened.
   */
  private createHookGeneration(registry: WatchedQueryPluginRegistry): boolean {
    const context = this.buildPluginContext();
    const signatureChanged = context.signature !== this.generationSignature;
    this.generationSignature = context.signature;
    this.pluginHooks = registry.createHooks(context, this.resolveExtensions());
    return signatureChanged;
  }

  /** Runs one hook fail-safe; a throwing plugin is dropped from this query. */
  private invokeHook(entry: ActiveQueryHooks, run: (hooks: typeof entry.hooks) => void): void {
    try {
      run(entry.hooks);
    } catch (error) {
      this.pluginHooks = this.pluginHooks?.filter((h) => h !== entry) ?? null;
      this.options.db.logger.log({
        level: LogLevels.warn,
        message: `Watched-query plugin '${entry.pluginId}' threw and was removed from this query.`,
        error
      });
    }
  }

  private trySeed(result: SeededResult, signal: AbortSignal): boolean {
    if (this.hasLiveResult || this.hasAdoptedSeed || this._closed || signal.aborted) {
      return false;
    }
    this.hasAdoptedSeed = true;
    try {
      // Runs user-supplied comparator code (the differential processor reseeds its
      // keyed snapshot here). A throw must not escape into the plugin's `seed()` call,
      // and must not leave the guard armed with nothing painted.
      this.onSeededDataAdopted(result.data);
    } catch (error) {
      this.hasAdoptedSeed = false;
      this.options.db.logger.log({
        level: LogLevels.warn,
        message: 'Watched query rejected plugin-seeded data: adopting it threw.',
        error
      });
      return false;
    }
    // Same `data?: Data` override linkQuery implementations use to satisfy updateState's
    // MutableWatchedQueryState<Data> parameter — Data isn't assignable to MutableDeep<Data>
    // for a bare generic, even though it always is once Data is concrete.
    const update: Partial<MutableWatchedQueryState<Data>> & { data?: Data; source?: string; sourceMeta?: unknown } = {
      isLoading: false,
      source: result.source,
      sourceMeta: result.sourceMeta ?? null
    };
    Object.assign(update, { data: result.data as Data });
    void this.updateState(update);
    return true;
  }

  /**
   * Called just before plugin-seeded rows are painted (always asynchronously relative
   * to construction, so subclass fields are initialised). Subclasses keeping state
   * derived from the previous result resynchronise it here.
   */
  protected onSeededDataAdopted(_rows: readonly unknown[]): void {}

  /** Consults seedInitial across hooks; first defined result wins. */
  private consultInitialSeed(): SeededResult | undefined {
    if (!this.pluginHooks) {
      return undefined;
    }
    for (const entry of [...this.pluginHooks]) {
      let result: SeededResult | undefined;
      this.invokeHook(entry, (hooks) => {
        result = hooks.seedInitial?.();
      });
      if (result) {
        return result;
      }
    }
    return undefined;
  }

  private startPluginLinks(signal: AbortSignal): void {
    if (!this.pluginHooks) {
      return;
    }
    for (const entry of [...this.pluginHooks]) {
      this.invokeHook(entry, (hooks) => {
        hooks.onLink?.((result) => this.trySeed(result, signal), signal);
      });
    }
  }

  private disposePluginHooks(): void {
    if (!this.pluginHooks) {
      return;
    }
    for (const entry of [...this.pluginHooks]) {
      this.invokeHook(entry, (hooks) => hooks.onDispose?.());
    }
    this.pluginHooks = null;
  }

  protected async updateSettingsInternal(settings: Settings, signal: AbortSignal, isInitialSetup = false) {
    // This may have been aborted while awaiting or if multiple calls to `updateSettings` were made
    if (this._closed || signal.aborted) {
      return;
    }

    this.options.watchOptions = settings;

    // `isInitialSetup` is true only for the single call init() makes right after
    // construction — at that point this.pluginHooks already reflects the current
    // settings (created in the constructor, or in init()'s deferred-hooks block), so
    // there is nothing to rebind yet.
    //
    // Every OTHER call — a real settings change via the public `updateSettings()`, or
    // AbstractQueryProcessor's own `schemaChanged` listener re-linking with the exact
    // same settings object — must unconditionally dispose and recreate hooks with a
    // fresh signal. Object identity of `settings` plays no part: schemaChanged always
    // re-links with the SAME reference, and its onLink registrations must still be
    // rebound against the new (non-aborted) signal, or seeding silently dies for the
    // rest of the query's life after the first schema change.
    //
    // Reopening the seeding guards is a SEPARATE decision, taken on the query
    // signature: a re-link for the same query must not let a plugin repaint cached
    // rows over the live data already on screen.
    if (!isInitialSetup) {
      this.disposePluginHooks();
      const registry = this.pluginRegistry;
      if (registry?.hasPlugins && registry.isOpen) {
        if (this.createHookGeneration(registry)) {
          // A different query: nothing on screen belongs to it, so seeding starts over.
          this.hasLiveResult = false;
          this.hasAdoptedSeed = false;
          const reseed = this.consultInitialSeed();
          if (reseed) {
            this.trySeed(reseed, signal);
          }
        }
        this.startPluginLinks(signal);
      } else {
        this.generationSignature = undefined;
      }
    }

    this.iterateListeners((l) => l[WatchedQueryListenerEvent.SETTINGS_WILL_UPDATE]?.());

    if (!this.state.isFetching && this.reportFetching) {
      await this.updateState({
        isFetching: true
      });
    }

    await this.runWithReporting(() =>
      this.linkQuery({
        abortSignal: signal,
        settings
      })
    );
  }

  /**
   * Updates the underlying query.
   */
  async updateSettings(settings: Settings) {
    // Abort the previous request
    this.abortController.abort();

    // Keep track of this controller's abort status
    const abortController = new AbortController();
    // Allow this to be aborted externally
    this.abortController = abortController;

    await this.initialized;
    return this.updateSettingsInternal(settings, abortController.signal);
  }

  /**
   * This method is used to link a query to the subscribers of this listener class.
   * This method should perform actual query watching and report results via {@link AbstractQueryProcessor.updateState} method.
   */
  protected abstract linkQuery(options: LinkQueryOptions<Data>): Promise<void>;

  protected async updateState(update: Partial<MutableWatchedQueryState<Data>>) {
    if (this._closed) {
      return;
    }

    if (typeof update.error !== 'undefined') {
      await this.iterateAsyncListenersWithError(async (l) => l.onError?.(update.error!));
      // An error always stops for the current fetching state
      update.isFetching = false;
      update.isLoading = false;
    }

    let emittedLiveData: Data | undefined;
    if (typeof update.data !== 'undefined' && typeof update.source === 'undefined') {
      update.source = 'live';
      update.sourceMeta = null;
      this.hasLiveResult = true;
      emittedLiveData = update.data as Data;
    }

    Object.assign(this.state, { lastUpdated: new Date() } satisfies Partial<WatchedQueryState<Data>>, update);

    if (typeof update.data !== 'undefined') {
      await this.iterateAsyncListenersWithError(async (l) => l.onData?.(this.state.data));
    }
    await this.iterateAsyncListenersWithError(async (l) => l.onStateChange?.(this.state));

    if (typeof emittedLiveData !== 'undefined' && this.pluginHooks) {
      const info: LiveResultInfo = {
        hasSynced: this.options.db.currentStatus?.hasSynced,
        dataIsArray: Array.isArray(emittedLiveData)
      };
      for (const entry of [...this.pluginHooks]) {
        this.invokeHook(entry, (hooks) => hooks.onResult?.(emittedLiveData, info));
      }
    }
  }

  /**
   * Configures base DB listeners and links the query to listeners.
   */
  protected async init(signal: AbortSignal) {
    const { db } = this.options;

    const disposeCloseListener = db.registerListener({
      closing: async () => {
        await this.close();
      }
    });

    // Link the plugins BEFORE waiting for the database. A seed that comes from the
    // plugin's own storage does not need SQLite, and the whole value of seeding is
    // skipping the wait: file open, version load, schema application and sync-status
    // resolution are the slow steps, and they are slowest precisely when the dataset
    // is large enough for a seeded paint to matter. Linking after `waitForReady()`
    // would bound every seeded result by the cost it exists to avoid.
    const linkedBeforeReady = this.pluginHooks != null;
    if (linkedBeforeReady && !signal.aborted) {
      this.startPluginLinks(signal);
    }

    // Wait for the schema to be set before listening to changes
    await db.waitForReady();

    // The query may have been closed while waiting — `close()` has already run its
    // `disposePluginHooks()`, so hooks created past that point would never receive
    // `onDispose`, and the listeners below would leak against a dead processor.
    if (this._closed) {
      disposeCloseListener();
      return;
    }

    // A superseding updateSettings() may have aborted this generation while we were
    // waiting. Its queued updateSettingsInternal owns hook creation and linking with a
    // fresh signal — hooks created here would hand plugins an onLink whose signal is
    // already dead. Skip this generation's hook work only: the close/schema listeners
    // below belong to the processor, not the generation, and nothing else ever
    // registers them.
    const superseded = signal.aborted;

    // Hooks deferred at construction (pre-ready query): create them now, after
    // onDatabaseOpen has run, and route their seedInitial through the async guard.
    if (this.hooksDeferred) {
      this.hooksDeferred = false;
      const registry = this.pluginRegistry;
      if (!superseded && registry?.hasPlugins && registry.isOpen) {
        this.createHookGeneration(registry);
        const deferredSeed = this.consultInitialSeed();
        if (deferredSeed) {
          this.trySeed(deferredSeed, signal);
        }
        // This generation was created after the pre-ready link above ran, so it still
        // needs linking; anything linked there must not be linked twice.
        if (!superseded) {
          this.startPluginLinks(signal);
        }
      }
    } else if (!superseded && !linkedBeforeReady) {
      this.startPluginLinks(signal);
    }

    const disposeSchemaListener = db.registerListener({
      schemaChanged: async () => {
        await this.runWithReporting(async () => {
          await this.updateSettings(this.options.watchOptions);
        });
      }
    });

    this.disposeListeners = () => {
      disposeCloseListener();
      disposeSchemaListener();
    };

    // Initial setup
    await this.runWithReporting(async () => {
      await this.updateSettingsInternal(this.options.watchOptions, signal, true);
    });
  }

  async close() {
    this._closed = true;
    this.abortController.abort();
    this.disposeListeners?.();
    this.disposeListeners = null;
    this.disposePluginHooks();
    this.iterateListeners((l) => l.closed?.());
    this.listeners.clear();
  }

  /**
   * Runs a callback and reports errors to the error listeners.
   */
  protected async runWithReporting<T>(callback: () => Promise<T>): Promise<void> {
    try {
      await callback();
    } catch (error: any) {
      // This will update the error on the state and iterate error listeners
      await this.updateState({ error });
    }
  }

  /**
   * Iterate listeners and reports errors to onError handlers.
   */
  protected async iterateAsyncListenersWithError(
    callback: (listener: Partial<WatchedQueryProcessorListener<Data>>) => Promise<void> | void
  ) {
    try {
      await this.iterateAsyncListeners(async (l) => callback(l));
    } catch (error: any) {
      try {
        await this.iterateAsyncListeners(async (l) => l.onError?.(error));
      } catch (error) {
        // Errors here are ignored
        // since we are already in an error state
        this.options.db.logger.log({
          level: LogLevels.error,
          message: 'Watched query error handler threw an Error',
          error
        });
      }
    }
  }
}
