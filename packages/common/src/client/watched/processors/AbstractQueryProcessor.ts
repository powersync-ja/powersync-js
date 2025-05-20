import { AbstractPowerSyncDatabase } from '../../../client/AbstractPowerSyncDatabase.js';
import { BaseListener, BaseObserver } from '../../../utils/BaseObserver.js';
import { WatchedQuery, WatchedQueryOptions, WatchedQueryState, WatchedQuerySubscription } from '../WatchedQuery.js';

/**
 * @internal
 */
export interface AbstractQueryProcessorOptions<Data> {
  db: AbstractPowerSyncDatabase;
  query: WatchedQueryOptions<Data>;
}

/**
 * @internal
 */
export interface LinkQueryOptions<Data> {
  abortSignal: AbortSignal;
  query: WatchedQueryOptions<Data>;
}

type WatchedQueryProcessorListener<Data> = WatchedQuerySubscription<Data> & BaseListener;

/**
 * Performs underlaying watching and yields a stream of results.
 * @internal
 */
export abstract class AbstractQueryProcessor<Data = unknown[]>
  extends BaseObserver<WatchedQueryProcessorListener<Data>>
  implements WatchedQuery<Data>
{
  readonly state: WatchedQueryState<Data>;

  protected abortController: AbortController;
  protected initialized: Promise<void>;

  constructor(protected options: AbstractQueryProcessorOptions<Data>) {
    super();
    this.abortController = new AbortController();
    this.state = {
      isLoading: true,
      isFetching: this.reportFetching, // Only set to true if we will report updates in future
      error: null,
      lastUpdated: null,
      data: options.query.customExecutor?.initialData ?? ([] as Data)
    };
    this.initialized = this.init();
  }

  protected get reportFetching() {
    return this.options.query.reportFetching ?? true;
  }

  /**
   * Updates the underlaying query.
   */
  async updateQuery(query: WatchedQueryOptions<Data>) {
    await this.initialized;

    this.options.query = query;
    this.abortController.abort();
    this.abortController = new AbortController();
    await this.linkQuery({
      abortSignal: this.abortController.signal,
      query
    });
  }

  /**
   * This method is used to link a query to the subscribers of this listener class.
   * This method should perform actual query watching and report results via {@link updateState} method.
   */
  protected abstract linkQuery(options: LinkQueryOptions<Data>): Promise<void>;

  protected async updateState(update: Partial<WatchedQueryState<Data>>) {
    if (typeof update.error !== 'undefined') {
      await this.iterateAsyncListenersWithError(async (l) => l.onError?.(update.error!));
    }

    if (typeof update.data !== 'undefined') {
      await this.iterateAsyncListenersWithError(async (l) => l.onData?.(update!.data!));
    }

    Object.assign(this.state, { lastUpdated: new Date() } satisfies Partial<WatchedQueryState<Data>>, update);
    await this.iterateAsyncListenersWithError(async (l) => l.onStateChange?.(this.state));
  }

  /**
   * Configures base DB listeners and links the query to listeners.
   */
  protected async init() {
    const { db } = this.options;

    db.registerListener({
      schemaChanged: async () => {
        await this.runWithReporting(async () => {
          await this.updateQuery(this.options.query);
        });
      },
      closing: () => {
        this.close();
      }
    });

    // Initial setup
    await this.runWithReporting(async () => {
      await this.updateQuery(this.options.query);
    });
  }

  subscribe(subscription: WatchedQuerySubscription<Data>): () => void {
    return this.registerListener({ ...subscription });
  }

  async close() {
    await this.initialized;
    this.abortController.abort();
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
