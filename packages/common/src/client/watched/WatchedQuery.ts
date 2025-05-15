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
}

export interface WatchedQuery<T> {
  readonly state: WatchedQueryState<T>;
  stream(): DataStream<WatchedQueryState<T>>;
  updateQuery(query: WatchedQueryOptions<T>): void;
  close(): void;
}
