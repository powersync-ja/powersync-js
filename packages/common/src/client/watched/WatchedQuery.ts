export interface WatchedQueryState<Data> {
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  isLoading: boolean;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
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
 * @internal
 */
export interface WatchedQueryOptions<DataType> {
  sql: string;
  parameters?: any[];
  /** The minimum interval between queries. */
  throttleMs?: number;
  /**
   * Optional query executor responsible for executing the query.
   * This can be used to return query results which are mapped from the database.
   * Often this is useful for ORM queries or other query builders.
   */
  customExecutor?: {
    execute: () => Promise<DataType>;
    initialData: DataType;
  };
  /**
   * If true (default) the watched query will update its state to report
   * on the fetching state of the query.
   * Setting to false reduces the number of state changes if the fetch status
   * is not relevant to the consumer.
   */
  reportFetching?: boolean;
}

export interface WatchedQuerySubscription<Data> {
  onData?: (data: Data) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  onStateChange?: (state: WatchedQueryState<Data>) => void | Promise<void>;
}

export interface WatchedQuery<Data> {
  /**
   * Current state of the watched query.
   */
  readonly state: WatchedQueryState<Data>;

  /**
   * Subscribe to watched query events.
   * @returns A function to unsubscribe from the events.
   */
  subscribe(subscription: WatchedQuerySubscription<Data>): () => void;

  /**
   * Updates the underlaying query.
   * This will trigger a re-evaluation of the query and update the state.
   */
  updateQuery(query: WatchedQueryOptions<Data>): Promise<void>;

  /**
   * Close the watched query and end all subscriptions.
   */
  close(): Promise<void>;
}
