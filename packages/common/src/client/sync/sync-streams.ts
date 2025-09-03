import { AbstractPowerSyncDatabase } from '../AbstractPowerSyncDatabase.js';

/**
 * A description of a sync stream, consisting of its {@link name} and the {@link parameters} used when subscribing.
 */
export interface SyncStreamDescription {
  /**
   * The name of the stream as it appears in the stream definition for the PowerSync service.
   */
  name: string;

  /**
   * The parameters used to subscribe to the stream, if any.
   *
   * The same stream can be subscribed to multiple times with different parameters.
   */
  parameters: Record<string, any> | null;
}

/**
 * Information about a subscribed sync stream.
 *
 * This includes the {@link SyncStreamDescription}, along with information about the current sync status.
 */
export interface SyncSubscriptionDescription extends SyncStreamDescription {
  active: boolean;
  /**
   * Whether this stream subscription is included by default, regardless of whether the stream has explicitly been
   * subscribed to or not.
   *
   * It's possible for both {@link isDefault} and {@link hasExplicitSubscription} to be true at the same time - this
   * happens when a default stream was subscribed explicitly.
   */
  isDefault: boolean;
  /**
   * Whether this stream has been subscribed to explicitly.
   *
   * It's possible for both {@link isDefault} and {@link hasExplicitSubscription} to be true at the same time - this
   * happens when a default stream was subscribed explicitly.
   */
  hasExplicitSubscription: boolean;
  /**
   * For sync streams that have a time-to-live, the current time at which the stream would expire if not subscribed to
   * again.
   */
  expiresAt: Date | null;
  /**
   * Whether this stream subscription has been synced at least once.
   */
  hasSynced: boolean;
  /**
   * If {@link hasSynced} is true, the last time data from this stream has been synced.
   */
  lastSyncedAt: Date | null;
}

export interface SyncStreamSubscribeOptions {
  /**
   * A "time to live" for this stream subscription, in seconds.
   *
   * The TTL control when a stream gets evicted after not having an active {@link SyncStreamSubscription} object
   * attached to it.
   */
  ttl?: number;
  /**
   * A priority to assign to this subscription. This overrides the default priority that may have been set on streams.
   *
   * For details on priorities, see [priotized sync](https://docs.powersync.com/usage/use-case-examples/prioritized-sync).
   */
  priority?: 0 | 1 | 2 | 3;
}

/**
 * A handle to a {@link SyncStreamDescription} that allows subscribing to the stream.
 *
 * To obtain an instance of {@link SyncStream}, call {@link AbstractPowerSyncDatabase.syncStream}.
 */
export interface SyncStream extends SyncStreamDescription {
  /**
   * Adds a subscription to this stream, requesting it to be included when connecting to the sync service.
   *
   * You should keep a reference to the returned {@link SyncStreamSubscription} object along as you need data for that
   * stream. As soon as {@link SyncStreamSubscription.unsubscribe} is called for all subscriptions on this stream
   * (including subscriptions created on other tabs), the {@link SyncStreamSubscribeOptions.ttl} starts ticking and will
   * eventually evict the stream (unless {@link subscribe} is called again).
   */
  subscribe(options?: SyncStreamSubscribeOptions): Promise<SyncStreamSubscription>;

  /**
   * Clears all subscriptions attached to this stream and resets the TTL for the stream.
   *
   * This is a potentially dangerous operations, as it interferes with other stream subscriptions.
   */
  unsubscribeAll(): Promise<void>;
}

export interface SyncStreamSubscription extends SyncStreamDescription {
  /**
   * A promise that resolves once data from in this sync stream has been synced and applied.
   */
  waitForFirstSync(): Promise<void>;

  /**
   * Removes this stream subscription.
   */
  unsubscribe(): void;
}
