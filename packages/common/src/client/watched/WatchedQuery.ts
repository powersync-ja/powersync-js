import { DataStream } from '../../utils/DataStream.js';
import { WatchedQueryResult } from './WatchedQueryResult.js';

export interface WatchedQueryState<T> {
  loading: boolean;
  fetching: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  data: WatchedQueryResult<T>;
}

/**
 * Performs underlaying watching and yields a stream of results.
 */
export interface WatchedQueryProcessor<T> {
  readonly state: WatchedQueryState<T>;

  generateStream(): Promise<DataStream<WatchedQueryState<T>>>;

  updateQuery(query: WatchedQueryOptions<T>): void;
}

export interface WatchedQueryOptions<T> {
  query: string;
  parameters?: any[];
  /** The minimum interval between queries. */
  throttleMs?: number;
  queryExecutor?: () => Promise<T[]>;
  /**
   * If true (default) the watched query will update its state to report
   * on the fetching state of the query.
   * Setting to false reduces the number of state changes if the fetch status
   * is not relevant to the consumer.
   */
  reportFetching?: boolean;
}

export interface WatchedQuery<T> {
  readonly state: WatchedQueryState<T>;
  stream(): DataStream<WatchedQueryState<T>>;
  updateQuery(query: WatchedQueryOptions<T>): void;
  close(): void;
}
