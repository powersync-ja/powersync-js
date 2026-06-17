import { WatchCompatibleQuery, WatchedQuery, WatchedQueryOptions } from '../WatchedQuery.js';

/**
 * Settings for {@link WatchedQuery} instances created via {@link Query#watch}.
 *
 * @public
 */
export interface WatchedQuerySettings<DataType> extends WatchedQueryOptions {
  query: WatchCompatibleQuery<DataType>;
}

/**
 * {@link WatchedQuery} returned from {@link Query#watch}.
 *
 * @public
 */
export type StandardWatchedQuery<DataType> = WatchedQuery<DataType, WatchedQuerySettings<DataType>>;
