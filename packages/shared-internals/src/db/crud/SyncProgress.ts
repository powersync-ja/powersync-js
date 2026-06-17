// (bucket, progress) pairs

import { ProgressWithOperations, SyncProgress } from '@powersync/common';
import { FULL_SYNC_PRIORITY } from '../../constants.js';
import { DownloadProgress } from '../../client/sync/stream/core-instruction.js';

export class SyncProgressImpl implements SyncProgress {
  totalOperations: number;
  downloadedOperations: number;
  downloadedFraction: number;

  constructor(protected internal: DownloadProgress) {
    const untilCompletion = this.untilPriority(FULL_SYNC_PRIORITY);

    this.totalOperations = untilCompletion.totalOperations;
    this.downloadedOperations = untilCompletion.downloadedOperations;
    this.downloadedFraction = untilCompletion.downloadedFraction;
  }

  untilPriority(priority: number): ProgressWithOperations {
    let total = 0;
    let downloaded = 0;

    for (const progress of Object.values(this.internal.buckets)) {
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
