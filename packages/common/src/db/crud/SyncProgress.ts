import type { BucketProgress } from '../../client/sync/stream/core-instruction.js';
import type { SyncStatus } from './SyncStatus.js';

// (bucket, progress) pairs
/** @internal */
export type InternalProgressInformation = Record<string, BucketProgress>;

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
  totalOperations: number;
  /**
   * The amount of operations that have already been downloaded.
   */
  downloadedOperations: number;

  /**
   * Relative progress, as {@link downloadedOperations} of {@link totalOperations}.
   *
   * This will be a number between `0.0` and `1.0` (inclusive).
   *
   * When this number reaches `1.0`, all changes have been received from the sync service.
   * Actually applying these changes happens before the `downloadProgress` field is cleared from
   * {@link SyncStatus}, so progress can stay at `1.0` for a short while before completing.
   */
  downloadedFraction: number;
}

/**
 * Provides realtime progress on how PowerSync is downloading rows.
 *
 * The progress until the next complete sync is available through the fields on {@link ProgressWithOperations},
 * which this class implements.
 * Additionally, the {@link SyncProgress.untilPriority} method can be used to otbain progress towards
 * a specific priority (instead of the progress for the entire download).
 *
 * The reported progress always reflects the status towards the end of a sync iteration (after
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
export class SyncProgress implements ProgressWithOperations {
  totalOperations: number;
  downloadedOperations: number;
  downloadedFraction: number;

  constructor(protected internal: InternalProgressInformation) {
    const untilCompletion = this.untilPriority(FULL_SYNC_PRIORITY);

    this.totalOperations = untilCompletion.totalOperations;
    this.downloadedOperations = untilCompletion.downloadedOperations;
    this.downloadedFraction = untilCompletion.downloadedFraction;
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
        downloaded += progress.since_last;
        total += progress.target_count - progress.at_last;
      }
    }

    let progress = total == 0 ? 0.0 : downloaded / total;
    return {
      totalOperations: total,
      downloadedOperations: downloaded,
      downloadedFraction: progress
    };
  }
}
