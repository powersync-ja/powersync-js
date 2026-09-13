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
import { ActiveQueryHooks, WatchedQueryPluginRegistry } from '../plugins/WatchedQueryPluginRegistry.js';
import { querySignature } from '../plugins/signature.js';
import { BasePowerSyncDatabase } from '../BasePowerSyncDatabase.js';

/**
 * @internal
 */
export interface AbstractQueryProcessorOptions<Data, Settings extends WatchedQueryOptions = WatchedQueryOptions> {
  db: BasePowerSyncDatabase;
  watchOptions: Settings;
  placeholderData: Data;
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
  /** Set while hooks were deferred because the registry had not opened yet. */
  private hooksDeferred = false;

  get closed() {
    return this._closed;
  }

  constructor(protected options: AbstractQueryProcessorOptions<Data, Settings>) {
    super();
    this.abortController = new AbortController();
    this._closed = false;

    const registry: WatchedQueryPluginRegistry | undefined = (this.options.db as any).pluginRegistry;
    if (registry?.hasPlugins) {
      if (registry.isOpen) {
        this.pluginHooks = registry.createHooks(this.buildPluginContext());
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
      return {
        isLoading: false,
        isFetching: true,
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

  private buildPluginContext(): WatchedQueryPluginContext {
    let compiled = { sql: '', parameters: [] as unknown[] };
    try {
      // `Settings` (constrained only to `WatchedQueryOptions`) does not itself declare
      // `query` — every concrete settings type (WatchedQuerySettings,
      // DifferentialWatchedQuerySettings, ...) does. Same shape as the `db` cast below.
      compiled = (this.options.watchOptions as any).query.compile() as typeof compiled;
    } catch {
      // A query that cannot compile yet still runs; plugins just see an empty signature.
    }
    return {
      signature: querySignature(compiled),
      compiled,
      dataIsArray: Array.isArray(this.options.placeholderData),
      extensionOptions: undefined, // per-plugin value filled by forEachHook below
      db: this.options.db as any
    };
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
    if (this.hasLiveResult || this._closed || signal.aborted) {
      return false;
    }
    this.onSeededDataAdopted(result.data);
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

  protected async updateSettingsInternal(settings: Settings, signal: AbortSignal) {
    // This may have been aborted while awaiting or if multiple calls to `updateSettings` were made
    if (this._closed || signal.aborted) {
      return;
    }

    // The very first call to this method is the "initial setup" call made from init(),
    // passing the same `watchOptions` object that already produced this.pluginHooks
    // (in the constructor, or in init()'s deferred-hooks block). Only an actual settings
    // change — a different `settings` object — should dispose and recreate hooks; doing
    // so unconditionally would tear down and rebuild hooks once per query for no reason,
    // double-counting onWatchedQueryCreate/onDispose calls.
    const settingsChanged = settings !== this.options.watchOptions;
    this.options.watchOptions = settings;

    if (settingsChanged || !this.pluginHooks) {
      this.hasLiveResult = false;
      this.disposePluginHooks();
      const registry: WatchedQueryPluginRegistry | undefined = (this.options.db as any).pluginRegistry;
      if (registry?.isOpen) {
        this.pluginHooks = registry.createHooks(this.buildPluginContext());
        const reseed = this.consultInitialSeed();
        if (reseed) {
          this.trySeed(reseed, signal);
        }
        this.startPluginLinks(signal);
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

  protected async updateState(
    update: Partial<MutableWatchedQueryState<Data>> & { source?: string; sourceMeta?: unknown }
  ) {
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
        hasSynced: (this.options.db as any).currentStatus?.hasSynced,
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

    // Wait for the schema to be set before listening to changes
    await db.waitForReady();

    // Hooks deferred at construction (pre-ready query): create them now, after
    // onDatabaseOpen has run, and route their seedInitial through the async guard.
    if (this.hooksDeferred) {
      this.hooksDeferred = false;
      const registry: WatchedQueryPluginRegistry | undefined = (this.options.db as any).pluginRegistry;
      if (registry?.isOpen) {
        this.pluginHooks = registry.createHooks(this.buildPluginContext());
        const deferredSeed = this.consultInitialSeed();
        if (deferredSeed) {
          this.trySeed(deferredSeed, signal);
        }
      }
    }
    this.startPluginLinks(signal);

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
      await this.updateSettingsInternal(this.options.watchOptions, signal);
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
