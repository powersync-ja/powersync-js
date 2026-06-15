import { SyncStreamDescription, SyncSubscriptionDescription } from '../../client/sync/sync-streams.js';
import { ProgressWithOperations, SyncProgress } from './SyncProgress.js';

/**
 * @public
 */
export type SyncDataFlowStatus = Partial<{
  /**
   * true if actively downloading changes.
   * This is only true when {@link connected} is also true.
   */
  downloading: boolean;
  /**
   * true if uploading changes.
   */
  uploading: boolean;
  /**
   * Error during downloading (including connecting).
   *
   * Cleared on the next successful data download.
   */
  downloadError?: Error;
  /**
   * Error during uploading.
   * Cleared on the next successful upload.
   */
  uploadError?: Error;
}>;

/**
 * @public
 */
export interface SyncPriorityStatus {
  priority: number;
  lastSyncedAt?: Date;
  hasSynced?: boolean;
}

/**
 * @public
 */
export interface SyncStatus {
  /**
   * Indicates if the client is currently connected to the PowerSync service.
   *
   * @returns True if connected, false otherwise. Defaults to false if not specified.
   */
  get connected(): boolean;

  /**
   * Indicates if the client is in the process of establishing a connection to the PowerSync service.
   *
   * @returns True if connecting, false otherwise. Defaults to false if not specified.
   */
  get connecting(): boolean;

  /**
   * Time that a last sync has fully completed, if any.
   * This timestamp is reset to null after a restart of the PowerSync service.
   *
   * @returns The timestamp of the last successful sync, or undefined if no sync has completed.
   */
  get lastSyncedAt(): Date | undefined;

  /**
   * Indicates whether there has been at least one full sync completed since initialization.
   *
   * @returns True if at least one sync has completed, false if no sync has completed,
   * or undefined when the state is still being loaded from the database.
   */
  get hasSynced(): boolean | undefined;

  /**
   * Provides the current data flow status regarding uploads and downloads.
   *
   * @returns An object containing:
   * - downloading: True if actively downloading changes (only when connected is also true)
   * - uploading: True if actively uploading changes
   * Defaults to `{downloading: false, uploading: false}` if not specified.
   */
  get dataFlowStatus(): SyncDataFlowStatus;

  /**
   * All sync streams currently being tracked in teh database.
   *
   * This returns null when the database is currently being opened and we don't have reliable information about all
   * included streams yet.
   */
  get syncStreams(): SyncStreamStatus[] | undefined;

  /**
   * If the `stream` appears in {@link SyncStatus.syncStreams}, returns the current status for that stream.
   */
  forStream(stream: SyncStreamDescription): SyncStreamStatus | undefined;

  /**
   * Provides sync status information for all bucket priorities, sorted by priority (highest first).
   *
   * @returns An array of status entries for different sync priority levels,
   * sorted with highest priorities (lower numbers) first.
   */
  get priorityStatusEntries(): SyncPriorityStatus[] | undefined;

  /**
   * A realtime progress report on how many operations have been downloaded and
   * how many are necessary in total to complete the next sync iteration.
   *
   * This field is only set when {@link SyncDataFlowStatus#downloading} is also true.
   */
  get downloadProgress(): SyncProgress | null;

  /**
   * Reports the sync status (a pair of {@link SyncStatus#hasSynced} and {@link SyncStatus#lastSyncedAt} fields)
   * for a specific bucket priority level.
   *
   * When buckets with different priorities are declared, PowerSync may choose to synchronize higher-priority
   * buckets first. When a consistent view over all buckets for all priorities up until the given priority is
   * reached, PowerSync makes data from those buckets available before lower-priority buckets have finished
   * syncing.
   *
   * This method returns the status for the requested priority or the next higher priority level that has
   * status information available. This is because when PowerSync makes data for a given priority available,
   * all buckets in higher-priorities are guaranteed to be consistent with that checkpoint.
   *
   * For example, if PowerSync just finished synchronizing buckets in priority level 3, calling this method
   * with a priority of 1 may return information for priority level 3.
   *
   * @param priority - The bucket priority for which the status should be reported
   * @returns Status information for the requested priority level or the next higher level with available status
   */
  statusForPriority(priority: number): SyncPriorityStatus | undefined;

  /**
   * Compares this SyncStatus instance with another to determine if they are equal.
   * Equality is determined by comparing the serialized JSON representation of both instances.
   *
   * @param status - The SyncStatus instance to compare against
   * @returns True if the instances are considered equal, false otherwise
   */
  isEqual(status: SyncStatus): boolean;

  /**
   * Creates a human-readable string representation of the current sync status.
   * Includes information about connection state, sync completion, and data flow.
   *
   * @returns A string representation of the sync status
   */
  getMessage(): string;
}

/**
 * Information about a sync stream subscription.
 *
 * @public
 */
export interface SyncStreamStatus {
  progress: ProgressWithOperations | null;
  subscription: SyncSubscriptionDescription;
  priority: number | null;
}
