import { isRecord, isStringArray, type JsonObject } from './json.js';
import { parseStreamBucketName } from './streams.js';
import type { SyncConfigStream } from './sync-config.js';

/**
 * A line from the PowerSync service's logs, as a log viewer holds it. Only `message` is required;
 * the fields the service attaches (`user_id`, `client_id`, `rid`, `client_params`) are read when present.
 */
export interface ServiceLogEntry {
  message: string;
  [field: string]: unknown;
}

/** What the service logs reveal about one client's sync session, enough to sync as it did. */
export interface ImpersonationTarget {
  /** The token subject to sync as: `user_id` on the log entry. */
  subject: string;
  /** The client that produced the log lines, shown so the session can be traced back to them. */
  clientId?: string;
  /** Parameters the client connected with, as the service logged them. */
  clientParams?: JsonObject;
  /** Buckets the service put in the client's checkpoint, which name the streams it synced. */
  buckets?: string[];
}

/** A subscription recovered for an impersonated session. */
export interface ImpersonatedSubscription {
  name: string;
  params?: JsonObject;
}

/** What an impersonated session does, once what the logs said has been reviewed and edited. */
export interface ImpersonationPlan {
  subject: string;
  clientId?: string;
  clientParams?: JsonObject;
  subscriptions: ImpersonatedSubscription[];
}

const readString = (entry: ServiceLogEntry, key: string): string | undefined => {
  const value = entry[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/** The user a log line is about, and so the subject a test client could sync as. */
export const readImpersonationSubject = (entry: ServiceLogEntry): string | undefined => readString(entry, 'user_id');

/**
 * The buckets a checkpoint log line lists.
 *
 * The service ends its checkpoint message with the bucket names as a JSON array, as in
 * `New checkpoint: 1 | write: null | buckets: 2 | param_results: 0 ["8#todos|0[]"]`.
 */
export function readCheckpointBuckets(message: string): string[] {
  const start = message.indexOf('[');
  if (start === -1) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(message.slice(start));
    return isStringArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Collects what a log entry, and the other loaded lines of the same sync session, say about the
 * client that produced it.
 *
 * One line rarely holds everything: the parameters are logged when the stream starts and the
 * buckets when a checkpoint is sent. Lines of one session share a request id, so the entries
 * already loaded are read together. Whatever is missing is simply not recovered.
 */
export function collectImpersonationTarget(
  entry: ServiceLogEntry,
  loadedEntries: readonly ServiceLogEntry[]
): ImpersonationTarget | null {
  const subject = readImpersonationSubject(entry);
  if (subject === undefined) {
    return null;
  }

  const requestId = readString(entry, 'rid');
  const clientId = readString(entry, 'client_id');
  const sessionEntries = loadedEntries.filter((candidate) => {
    if (readImpersonationSubject(candidate) !== subject) {
      return false;
    }
    if (requestId !== undefined) {
      return readString(candidate, 'rid') === requestId;
    }
    return clientId !== undefined && readString(candidate, 'client_id') === clientId;
  });

  const entries = sessionEntries.length > 0 ? sessionEntries : [entry];
  let clientParams: JsonObject | undefined;
  const buckets = new Set<string>();

  for (const sessionEntry of entries) {
    const params = sessionEntry.client_params;
    if (isRecord(params) && Object.keys(params).length > 0) {
      clientParams = params as JsonObject;
    }
    for (const bucket of readCheckpointBuckets(sessionEntry.message)) {
      buckets.add(bucket);
    }
  }

  return {
    subject,
    clientId,
    clientParams,
    buckets: buckets.size > 0 ? [...buckets] : undefined
  };
}

/**
 * Pairs the values in a bucket's name with the parameter keys the stream reads.
 *
 * A bucket is named for the values its parameter queries returned, so a stream reading a single
 * parameter says exactly what that parameter was. With several the order is the sync config's, not
 * something this can line up, so nothing is claimed.
 */
const zipSingleParameter = (keys: string[], values: readonly unknown[]): JsonObject | undefined => {
  if (keys.length !== 1 || values.length !== 1) {
    return undefined;
  }
  const [key] = keys;
  // Bucket names are JSON, so the value already is one.
  return key !== undefined ? { [key]: values[0] as JsonObject[string] } : undefined;
};

/**
 * The connection parameters a client must have used, read back from its bucket names.
 *
 * The service logs `client_params` for legacy client parameters, and an edition 3 connection
 * parameter only shows up in the buckets it produced. Recovering it means a stream that reads one
 * connection parameter and one bucket for it.
 */
export function recoverConnectionParams(buckets: readonly string[], streams: SyncConfigStream[]): JsonObject {
  const recovered: JsonObject = {};
  for (const bucket of buckets) {
    const parsed = parseStreamBucketName(bucket);
    const stream = streams.find((candidate) => candidate.name === parsed?.stream);
    if (!parsed || !stream) {
      continue;
    }
    Object.assign(recovered, zipSingleParameter(stream.connectionParameterKeys, parsed.parameters));
  }
  return recovered;
}

/**
 * The subscriptions to make so an impersonated session syncs the streams the client synced.
 *
 * Streams that sync for every client need no subscription, so only the rest are returned, with the
 * parameter values their bucket names give away.
 */
export function recoverSubscriptions(
  buckets: readonly string[],
  streams: SyncConfigStream[]
): ImpersonatedSubscription[] {
  const recovered = new Map<string, ImpersonatedSubscription>();
  for (const bucket of buckets) {
    const parsed = parseStreamBucketName(bucket);
    const stream = streams.find((candidate) => candidate.name === parsed?.stream);
    if (!parsed || !stream || stream.isAutoSubscribed) {
      continue;
    }
    recovered.set(bucket, {
      name: stream.name,
      params: zipSingleParameter(stream.subscriptionParameterKeys, parsed.parameters)
    });
  }
  return [...recovered.values()];
}
