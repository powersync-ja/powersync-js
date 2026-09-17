import { isRecord, parseJsonObject, type JsonObject } from './json.js';
import type { BucketState } from './shapes.js';
import type { OplogStats, QueryRunner } from './tables.js';

/** A stream bucket's name, taken apart. */
export interface StreamBucketName {
  stream: string;
  /** The values the stream's parameter queries returned for this bucket, in the config's order. */
  parameters: unknown[];
}

/**
 * Takes apart the name of a bucket the service created for a stream.
 *
 * Those are named `<stream>|<variant><parameters>`, prefixed with `<version>#` on instances that
 * version their buckets, as in `8#lists_by_name|0["renew"]`. Legacy Sync Rules buckets are named
 * after their bucket definition and belong to no stream, so they return null.
 */
export function parseStreamBucketName(bucketName: string): StreamBucketName | null {
  const separator = bucketName.indexOf('|');
  if (separator <= 0) {
    return null;
  }
  const prefix = bucketName.slice(0, separator);
  const versionSeparator = prefix.lastIndexOf('#');
  const stream = versionSeparator === -1 ? prefix : prefix.slice(versionSeparator + 1);
  if (stream.length === 0) {
    return null;
  }

  const tail = bucketName.slice(separator + 1);
  const parametersStart = tail.indexOf('[');
  if (parametersStart === -1) {
    return { stream, parameters: [] };
  }
  try {
    const parsed: unknown = JSON.parse(tail.slice(parametersStart));
    return { stream, parameters: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { stream, parameters: [] };
  }
}

/** The stream a bucket belongs to, or null for a bucket that belongs to none. */
export const streamNameFromBucket = (bucketName: string): string | null =>
  parseStreamBucketName(bucketName)?.stream ?? null;

/** What one stream's buckets hold locally, and how much of them has been downloaded. */
export interface StreamStats {
  /** Distinct rows across this stream's buckets. */
  rowCount: number;
  operationCount: number;
  size: number;
  bucketCount: number;
  downloadedOperations: number;
  /** Total operations in the current checkpoint, or null when no bucket reports one. */
  totalOperations: number | null;
  isDownloading: boolean;
}

const EMPTY_STATS: StreamStats = {
  rowCount: 0,
  operationCount: 0,
  size: 0,
  bucketCount: 0,
  downloadedOperations: 0,
  totalOperations: null,
  isDownloading: false
};

/**
 * Rolls per-bucket numbers up to the stream that produced them, so a stream's rows and operations
 * stay visible once its download has finished and `progress` is no longer reported.
 *
 * Subscriptions to the same stream with different parameters get their own buckets but share the
 * stream's name, so they share these totals.
 */
export function collectStreamStats(
  bucketStats: readonly OplogStats[],
  buckets: readonly BucketState[]
): Map<string, StreamStats> {
  const byStream = new Map<string, StreamStats>();

  const forStream = (bucketName: string): StreamStats | undefined => {
    const streamName = streamNameFromBucket(bucketName);
    if (streamName === null) {
      return undefined;
    }
    const existing = byStream.get(streamName);
    if (existing) {
      return existing;
    }
    const created = { ...EMPTY_STATS };
    byStream.set(streamName, created);
    return created;
  };

  for (const entry of bucketStats) {
    const stats = forStream(entry.name);
    if (!stats) {
      continue;
    }
    stats.rowCount += entry.rowCount;
    stats.operationCount += entry.operationCount;
    stats.size += entry.size;
    stats.bucketCount += 1;
  }

  for (const bucket of buckets) {
    const stats = forStream(bucket.name);
    if (!stats) {
      continue;
    }
    stats.downloadedOperations += bucket.downloadedOperations;
    if (bucket.totalOperations !== null) {
      stats.totalOperations = (stats.totalOperations ?? 0) + bucket.totalOperations;
    }
    stats.isDownloading = stats.isDownloading || bucket.downloading;
  }

  return byStream;
}

/**
 * Identifies one subscription. The same stream subscribed to with different parameters is a
 * separate subscription, and parameter order is not part of the identity.
 */
export function subscriptionKey(name: string | null, params: Record<string, unknown> | null | undefined): string {
  const entries = Object.entries(params ?? {}).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([name ?? '', entries]);
}

/**
 * The core keeps timestamps as microseconds since the epoch (`unixepoch('subsec') * 1000000`).
 *
 * The SDK's own status reports these per stream in a unit that overflows the range a `Date` can
 * hold, so its `lastSyncedAt` and `expiresAt` arrive as NaN. Reading the table the core writes
 * gives the real values, along with the TTL and expiry that decide when a subscription is evicted.
 */
const CORE_MICROSECONDS_PER_MS = 1000;

const toEpochMs = (microseconds: number | null): number | null =>
  microseconds === null ? null : microseconds / CORE_MICROSECONDS_PER_MS;

/** One row of `ps_stream_subscriptions`: what the client will actually sync, and until when. */
export interface StoredSubscription {
  key: string;
  name: string;
  /** Seconds the subscription outlives its release, or null while it is held. */
  ttl: number | null;
  expiresAt: number | null;
  lastSyncedAt: number | null;
  isActive: boolean;
  isDefault: boolean;
}

/**
 * Subscriptions made at runtime, as opposed to the rows the core keeps for default streams: those
 * carry no TTL and are marked default. A default stream that was also subscribed to explicitly
 * keeps its TTL, so it counts.
 */
export const EXPLICIT_SUBSCRIPTIONS_SQL = `
  SELECT stream_name, local_params
  FROM ps_stream_subscriptions
  WHERE is_default = 0 OR ttl IS NOT NULL`;

export interface SubscriptionIdentity {
  name: string;
  params: JsonObject | null;
}

/** The stream and parameters of each `ps_stream_subscriptions` row, skipping rows that are not one. */
export function parseSubscriptionRows(rows: readonly unknown[]): SubscriptionIdentity[] {
  const identities: SubscriptionIdentity[] = [];
  for (const row of rows) {
    if (isRecord(row) && typeof row.stream_name === 'string' && typeof row.local_params === 'string') {
      identities.push({ name: row.stream_name, params: parseJsonObject(row.local_params) });
    }
  }
  return identities;
}

const STREAM_SUBSCRIPTIONS_SQL = `
  SELECT stream_name, local_params, ttl, expires_at, last_synced_at, active, is_default
  FROM ps_stream_subscriptions`;

/** SQLite may hand numbers over as text. Null stays null; anything unreadable is undefined. */
const toNullableNumber = (value: unknown): number | null | undefined => {
  if (value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
};

const toStoredSubscription = (row: unknown): StoredSubscription | null => {
  if (!isRecord(row) || typeof row.stream_name !== 'string' || typeof row.local_params !== 'string') {
    return null;
  }
  const ttl = toNullableNumber(row.ttl);
  const expiresAt = toNullableNumber(row.expires_at);
  const lastSyncedAt = toNullableNumber(row.last_synced_at);
  const active = toNullableNumber(row.active);
  const isDefault = toNullableNumber(row.is_default);
  if ([ttl, expiresAt, lastSyncedAt, active, isDefault].includes(undefined)) {
    return null;
  }
  return {
    key: subscriptionKey(row.stream_name, parseJsonObject(row.local_params)),
    name: row.stream_name,
    ttl: ttl ?? null,
    expiresAt: toEpochMs(expiresAt ?? null),
    lastSyncedAt: toEpochMs(lastSyncedAt ?? null),
    isActive: (active ?? 0) !== 0,
    isDefault: (isDefault ?? 0) !== 0
  };
};

/** The subscriptions the client holds, keyed the way {@link subscriptionKey} keys the reported ones. */
export async function readStoredSubscriptions(client: QueryRunner): Promise<Map<string, StoredSubscription>> {
  const result = await client.runQuery({ sql: STREAM_SUBSCRIPTIONS_SQL });
  const stored = new Map<string, StoredSubscription>();
  for (const row of result.rows) {
    const subscription = toStoredSubscription(row);
    if (subscription) {
      stored.set(subscription.key, subscription);
    }
  }
  return stored;
}
