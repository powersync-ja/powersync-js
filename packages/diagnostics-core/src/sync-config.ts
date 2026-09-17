import { isRecord, isStringArray, isStringRecord, parseJson, type JsonObject, type JsonValue } from './json.js';

export interface SyncConfigStream {
  name: string;
  isAutoSubscribed: boolean;
  /** Keys referenced through `subscription.parameter(...)` in this stream's queries. */
  subscriptionParameterKeys: string[];
  /** Keys referenced through `connection.parameter(...)` in this stream's queries. */
  connectionParameterKeys: string[];
}

export interface SyncConfigParameters {
  /** Whether there was a Sync Config to read. Without one the lists below are empty for want of it. */
  hasConfig: boolean;
  streams: SyncConfigStream[];
  /**
   * Keys referenced through `connection.parameter(...)`, or in legacy Sync Rules through
   * `request.parameters()` and its deprecated spelling `user_parameters.*`.
   */
  connectionParameterKeys: string[];
}

const NO_CONFIG: SyncConfigParameters = { hasConfig: false, streams: [], connectionParameterKeys: [] };

const SUBSCRIPTION_PARAMETER_PATTERNS = [
  /subscription\.parameter\(\s*'([^']+)'\s*\)/g,
  /subscription\.parameters\(\)\s*->>\s*'([^']+)'/g
];

const CONNECTION_PARAMETER_PATTERNS = [
  /connection\.parameter\(\s*'([^']+)'\s*\)/g,
  /connection\.parameters\(\)\s*->>\s*'([^']+)'/g,
  /request\.parameters\(\)\s*->>\s*'([^']+)'/g,
  /\buser_parameters\.([A-Za-z_]\w*)/g
];

/** Marks a config value whose shape the reader does not accept. */
const INVALID = Symbol('invalid');

/**
 * A query in a Sync Config is a string or a list of strings. Absent reads as no text; anything else
 * is a shape this reader does not understand.
 */
const toSqlText = (value: unknown): string | typeof INVALID => {
  if (value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return isStringArray(value) ? value.join('\n') : INVALID;
};

const collectKeys = (sql: string, patterns: RegExp[]): string[] => {
  const keys = new Set<string>();
  for (const pattern of patterns) {
    for (const match of sql.matchAll(pattern)) {
      const key = match[1];
      if (key !== undefined) {
        keys.add(key);
      }
    }
  }
  return Array.from(keys);
};

/**
 * Reads the parameter keys a deployed Sync Config expects from clients, so a diagnostics view can
 * offer one input per key instead of free-form JSON.
 *
 * Only the slice of the config this needs is read: `streams` (with `query`, `queries`, `with` and
 * `auto_subscribe`) and legacy `bucket_definitions` (with `parameters`). Unknown keys are ignored;
 * a known key of the wrong shape makes the whole config unreadable, since it is then not a Sync Config.
 */
export function readSyncConfigParameters(parsedConfig: unknown): SyncConfigParameters {
  if (!isRecord(parsedConfig)) {
    return NO_CONFIG;
  }
  const { streams: streamsValue, bucket_definitions: bucketsValue } = parsedConfig;
  if (
    (streamsValue !== undefined && !isRecord(streamsValue)) ||
    (bucketsValue !== undefined && !isRecord(bucketsValue))
  ) {
    return NO_CONFIG;
  }

  const connectionKeys = new Set<string>();
  const streams: SyncConfigStream[] = [];

  for (const [name, definition] of Object.entries(streamsValue ?? {})) {
    if (!isRecord(definition)) {
      return NO_CONFIG;
    }
    const query = toSqlText(definition.query);
    const queries = toSqlText(definition.queries);
    const withQueries = definition.with === undefined ? {} : definition.with;
    if (
      query === INVALID ||
      queries === INVALID ||
      !isStringRecord(withQueries) ||
      (definition.auto_subscribe !== undefined && typeof definition.auto_subscribe !== 'boolean')
    ) {
      return NO_CONFIG;
    }

    const sql = [query, queries, ...Object.values(withQueries)].join('\n');
    const streamConnectionKeys = collectKeys(sql, CONNECTION_PARAMETER_PATTERNS);
    streams.push({
      name,
      isAutoSubscribed: definition.auto_subscribe === true,
      subscriptionParameterKeys: collectKeys(sql, SUBSCRIPTION_PARAMETER_PATTERNS),
      connectionParameterKeys: streamConnectionKeys
    });
    for (const key of streamConnectionKeys) {
      connectionKeys.add(key);
    }
  }

  for (const definition of Object.values(bucketsValue ?? {})) {
    if (!isRecord(definition)) {
      return NO_CONFIG;
    }
    const parameters = toSqlText(definition.parameters);
    if (parameters === INVALID) {
      return NO_CONFIG;
    }
    for (const key of collectKeys(parameters, CONNECTION_PARAMETER_PATTERNS)) {
      connectionKeys.add(key);
    }
  }

  return { hasConfig: true, streams, connectionParameterKeys: Array.from(connectionKeys) };
}

/**
 * The streams worth offering in a subscribe dialog.
 *
 * A stream that syncs for every client already and reads no subscription parameters gains nothing
 * from an explicit subscription. One with subscription parameters is kept even when it is
 * auto-subscribed, since the automatic subscription carries no parameter values.
 */
export function selectSubscribableStreams(streams: SyncConfigStream[]): SyncConfigStream[] {
  return streams.filter((stream) => !stream.isAutoSubscribed || stream.subscriptionParameterKeys.length > 0);
}

/** A parameter typed into a text input: JSON when it parses as JSON, otherwise the text itself. */
export function coerceParameterValue(text: string): JsonValue {
  return parseJson(text) ?? text;
}

/** Whether two parameter objects would make the same sync request. Key order does not matter. */
export function areParameterObjectsEqual(
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined
): boolean {
  const normalise = (params: Record<string, unknown> | undefined) =>
    JSON.stringify(Object.entries(params ?? {}).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)));
  return normalise(left) === normalise(right);
}

export type { JsonObject as ParameterObject };
