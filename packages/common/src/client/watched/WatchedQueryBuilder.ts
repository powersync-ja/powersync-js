import { WatchedQuery } from './WatchedQuery.js';

export enum IncrementalWatchMode {
  COMPARISON = 'comparison',
  DIFFERENTIAL = 'differential'
}

/**
 * Builds a {@link WatchedQuery} instance given a set of options.
 */
export interface WatchedQueryBuilder {
  build(options: {}): WatchedQuery;
}
