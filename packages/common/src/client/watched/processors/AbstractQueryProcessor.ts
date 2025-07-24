import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { MetaBaseObserver } from '../../../utils/MetaBaseObserver.js';
import { WatchedQuery, WatchedQueryListener, WatchedQueryOptions, WatchedQueryState } from '../WatchedQuery.js';

/**
 * @internal
 */
export interface AbstractQueryProcessorOptions<Data, Settings extends WatchedQueryOptions = WatchedQueryOptions> {
  db: AbstractPowerSyncDatabase;
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

  get closed() {
    return this._closed;
  }

  constructor(protected options: AbstractQueryProcessorOptions<Data, Settings>) {
    super();
    this.abortController = new AbortController();
    this._closed = false;
    this.state = this.constructInitialState();
    this.disposeListeners = null;
    this.initialized = this.init();
  }

  protected constructInitialState(): WatchedQueryState<Data> {
    return {
      isLoading: true,
      isFetching: this.reportFetching, // Only set to true if we will report updates in future
      error: null,
      lastUpdated: null,
      data: this.options.placeholderData
    };
  }

  protected get reportFetching() {
    return this.options.watchOptions.reportFetching ?? true;
  }

  /**
   * Updates the underlying query.
   */
  async updateSettings(settings: Settings) {
    await this.initialized;

    if (!this.state.isFetching && this.reportFetching) {
      await this.updateState({
        isFetching: true
      });
    }

    this.options.watchOptions = settings;
    this.abortController.abort();
    this.abortController = new AbortController();
    await this.runWithReporting(() =>
      this.linkQuery({
        abortSignal: this.abortController.signal,
        settings
      })
    );
  }

  /**
   * This method is used to link a query to the subscribers of this listener class.
   * This method should perform actual query watching and report results via {@link updateState} method.
   */
  protected abstract linkQuery(options: LinkQueryOptions<Data>): Promise<void>;

  protected async updateState(update: Partial<MutableWatchedQueryState<Data>>) {
    if (typeof update.error !== 'undefined') {
      await this.iterateAsyncListenersWithError(async (l) => l.onError?.(update.error!));
      // An error always stops for the current fetching state
      update.isFetching = false;
      update.isLoading = false;
    }

    Object.assign(this.state, { lastUpdated: new Date() } satisfies Partial<WatchedQueryState<Data>>, update);

    if (typeof update.data !== 'undefined') {
      await this.iterateAsyncListenersWithError(async (l) => l.onData?.(this.state.data));
    }

    await this.iterateAsyncListenersWithError(async (l) => l.onStateChange?.(this.state));
  }

  /**
   * Configures base DB listeners and links the query to listeners.
   */
  protected async init() {
    const { db } = this.options;

    const disposeCloseListener = db.registerListener({
      closing: async () => {
        await this.close();
      }
    });

    // Wait for the schema to be set before listening to changes
    await db.waitForReady();
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
    this.runWithReporting(async () => {
      await this.updateSettings(this.options.watchOptions);
    });
  }

  async close() {
    await this.initialized;
    this.abortController.abort();
    this.disposeListeners?.();
    this.disposeListeners = null;
    this._closed = true;
    this.iterateListeners((l) => l.closed?.());
    this.listeners.clear();
  }

  /**
   * Runs a callback and reports errors to the error listeners.
   */
  protected async runWithReporting<T>(callback: () => Promise<T>): Promise<void> {
    try {
      await callback();
    } catch (error) {
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
    } catch (error) {
      try {
        await this.iterateAsyncListeners(async (l) => l.onError?.(error));
      } catch (error) {
        // Errors here are ignored
        // since we are already in an error state
        this.options.db.logger.error('Watched query error handler threw an Error', error);
      }
    }
  }
}
