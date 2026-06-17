import { WatchedQueryOptions } from '@powersync/common';

/**
 * @internal
 */
export const DEFAULT_WATCH_THROTTLE_MS = 30;

/**
 * @internal
 */
export const DEFAULT_WATCH_QUERY_OPTIONS: WatchedQueryOptions = {
  throttleMs: DEFAULT_WATCH_THROTTLE_MS,
  reportFetching: true
};
