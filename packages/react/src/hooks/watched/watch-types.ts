import { DifferentialWatchedQueryComparator, SQLOnChangeOptions, SyncSubscriptionDescription } from '@powersync/common';
import { UseSyncStreamOptions } from '../streams.js';

export interface HookWatchOptions extends Omit<SQLOnChangeOptions, 'signal'> {
  /**
   * An optional array of sync streams (with names and parameters) backing the query.
   *
   * When set, `useQuery` will subscribe to those streams (and automatically handle unsubscribing from them, too).
   *
   * If {@link QuerySyncStreamOptions} is set on a stream, `useQuery` will remain in a loading state until that stream
   * is marked as {@link SyncSubscriptionDescription.hasSynced}. This ensures the query is not missing rows that haven't
   * been downloaded.
   * Note however that after an initial sync, the query will not block itself while new rows are downloading. Instead,
   * consistent sync snapshots will be made available as they've been processed by PowerSync.
   *
   * @experimental Sync streams are currently in alpha.
   */
  streams?: QuerySyncStreamOptions[];
  reportFetching?: boolean;
}

/**
 * Additional options to control how `useQuery` behaves when subscribing to a stream.
 */
export interface QuerySyncStreamOptions extends UseSyncStreamOptions {
  /**
   * When set to `true`, a `useQuery` hook will remain in a loading state as long as the stream is resolving or
   * downloading for the first time (in other words, until {@link SyncSubscriptionDescription.hasSynced} is true).
   */
  waitForStream?: boolean;
}

export interface AdditionalOptions extends HookWatchOptions {
  runQueryOnce?: boolean;
}

export interface DifferentialHookOptions<RowType> extends HookWatchOptions {
  /**
   * Used to compare result sets.
   *
   * By default the hook will requery on any dependent table change. This will
   * emit a new hook result even if the result set has not changed.
   *
   * Specifying a {@link DifferentialWatchedQueryComparator} will remove emissions for
   * unchanged result sets.
   * Furthermore, emitted `data` arrays will preserve object references between result set emissions
   * for unchanged rows.
   * @example
   * ```javascript
   * {
   *  rowComparator: {
   *    keyBy: (item) => item.id,
   *    compareBy: (item) => JSON.stringify(item)
   *  }
   * }
   * ```
   */
  rowComparator?: DifferentialWatchedQueryComparator<RowType>;
}

export type ReadonlyQueryResult<RowType> = {
  readonly data: ReadonlyArray<Readonly<RowType>>;
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  readonly isLoading: boolean;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  readonly isFetching: boolean;
  readonly error: Error | undefined;
  /**
   * Function used to run the query again.
   */
  refresh?: (signal?: AbortSignal) => Promise<void>;
};

export type QueryResult<RowType> = {
  data: RowType[];
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  isLoading: boolean;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  isFetching: boolean;
  error: Error | undefined;
  /**
   * Function used to run the query again.
   */
  refresh?: (signal?: AbortSignal) => Promise<void>;
};
