import type { SyncStatus } from './SyncStatus.js';

// (bucket, progress) pairs
/** @internal */
export type InternalProgressInformation = Record<
  string,
  {
    priority: number; // Priority of the associated buckets
    atLast: number; // Total ops at last completed sync, or 0
    sinceLast: number; // Total ops _since_ the last completed sync.
    targetCount: number; // Total opcount for next checkpoint as indicated by service.
  }
>;

/**
 * @internal The priority used by the core extension to indicate that a full sync was completed.
 */
export const FULL_SYNC_PRIORITY = 2147483647;

/**
 * Information about a progressing download made by the PowerSync SDK.
 *
 * To obtain these values, use {@link SyncProgress}, available through
 * {@link SyncStatus#downloadProgress}.
 */
export interface ProgressWithOperations {
  /**
   * The total amount of operations to download for the current sync iteration
   * to complete.
   */
  total: number;
  /**
   * The amount of operations that have already been downloaded.
   */
  completed: number;

  /**
   * Relative progress, as {@link completed} of {@link total}. This will be a number
   * between `0.0` and `1.0`.
   */
  fraction: number;
}

/**
 * Provides realtime progress on how PowerSync is downloading rows.
 *
 * The reported progress always reflects the status towards th end of a sync iteration (after
 * which a consistent snapshot of all buckets is available locally).
 *
 * In rare cases (in particular, when a [compacting](https://docs.powersync.com/usage/lifecycle-maintenance/compacting-buckets)
 * operation takes place between syncs), it's possible for the returned numbers to be slightly
 * inaccurate. For this reason, {@link SyncProgress} should be seen as an approximation of progress.
 * The information returned is good enough to build progress bars, but not exact enough to track
 * individual download counts.
 *
 * Also note that data is downloaded in bulk, which means that individual counters are unlikely
 * to be updated one-by-one.
 */
export class SyncProgress {
  constructor(protected internal: InternalProgressInformation) {}

  /**
   * Returns donwload progress towards a complete checkpoint being received.
   *
   * The returned {@link ProgressWithOperations} tracks the target amount of operations that need
   * to be downloaded in total and how many of them have already been received.
   */
  get untilCompletion(): ProgressWithOperations {
    return this.untilPriority(FULL_SYNC_PRIORITY);
  }

  /**
   * Returns download progress towards all data up until the specified priority being received.
   *
   * The returned {@link ProgressWithOperations} tracks the target amount of operations that need
   * to be downloaded in total and how many of them have already been received.
   */
  untilPriority(priority: number): ProgressWithOperations {
    let total = 0;
    let downloaded = 0;

    for (const progress of Object.values(this.internal)) {
      // Include higher-priority buckets, which are represented by lower numbers.
      if (progress.priority <= priority) {
        downloaded += progress.sinceLast;
        total += progress.targetCount - progress.atLast;
      }
    }

    let progress = total == 0 ? 0.0 : downloaded / total;
    return {
      total,
      completed: downloaded,
      fraction: progress
    };
  }
}
