import { CompiledQuery } from '../../types/types.js';
import { BaseListener } from '../../utils/BaseObserver.js';
import { MetaBaseObserverInterface } from '../../utils/MetaBaseObserver.js';
import { AbstractPowerSyncDatabase } from '../AbstractPowerSyncDatabase.js';

/**
 * State for {@link WatchedQuery} instances.
 */
export interface WatchedQueryState<Data> {
  /**
   * Indicates the initial loading state (hard loading).
   * Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  isLoading: boolean;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load
   * and any time when the query is re-evaluating (useful for large queries).
   */
  isFetching: boolean;
  /**
   * The last error that occurred while executing the query.
   */
  error: Error | null;
  /**
   * The last time the query was updated.
   */
  lastUpdated: Date | null;
  /**
   * The last data returned by the query.
   */
  data: Data;
}

/**
 * Options provided to the `execute` method of a {@link WatchCompatibleQuery}.
 */
export interface WatchExecuteOptions {
  sql: string;
  parameters: any[];
  db: AbstractPowerSyncDatabase;
}

/**
 * Similar to {@link CompatibleQuery}, except the `execute` method
 * does not enforce an Array result type.
 */
export interface WatchCompatibleQuery<ResultType> {
  execute(options: WatchExecuteOptions): Promise<ResultType>;
  compile(): CompiledQuery;
}

export interface WatchedQueryOptions {
  /** The minimum interval between queries. */
  throttleMs?: number;
  /**
   * If true (default) the watched query will update its state to report
   * on the fetching state of the query.
   * Setting to false reduces the number of state changes if the fetch status
   * is not relevant to the consumer.
   */
  reportFetching?: boolean;
}

export enum WatchedQueryListenerEvent {
  ON_DATA = 'onData',
  ON_ERROR = 'onError',
  ON_STATE_CHANGE = 'onStateChange',
  CLOSED = 'closed'
}

export interface WatchedQueryListener<Data> extends BaseListener {
  [WatchedQueryListenerEvent.ON_DATA]?: (data: Data) => void | Promise<void>;
  [WatchedQueryListenerEvent.ON_ERROR]?: (error: Error) => void | Promise<void>;
  [WatchedQueryListenerEvent.ON_STATE_CHANGE]?: (state: WatchedQueryState<Data>) => void | Promise<void>;
  [WatchedQueryListenerEvent.CLOSED]?: () => void | Promise<void>;
}

export interface WatchedQuery<Data = unknown, Settings extends WatchedQueryOptions = WatchedQueryOptions>
  extends MetaBaseObserverInterface<WatchedQueryListener<Data>> {
  /**
   * Current state of the watched query.
   */
  readonly state: WatchedQueryState<Data>;

  readonly closed: boolean;

  /**
   * Subscribe to watched query events.
   * @returns A function to unsubscribe from the events.
   */
  registerListener(listener: WatchedQueryListener<Data>): () => void;

  /**
   * Updates the underlying query options.
   * This will trigger a re-evaluation of the query and update the state.
   */
  updateSettings(options: Settings): Promise<void>;

  /**
   * Close the watched query and end all subscriptions.
   */
  close(): Promise<void>;
}
