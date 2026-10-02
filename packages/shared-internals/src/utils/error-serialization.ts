// Clone-safe representation of errors crossing a worker boundary.

export const RELAY_ERROR_MARKER = '__powersyncError';

export type ErrorRelayState = 'serialized' | 'partial' | 'missing';

/** Structurally Error-like, but `instanceof Error` is false. */
export interface SerializedRelayError {
  [RELAY_ERROR_MARKER]: true;
  name: string;
  message: string;
  stack?: string;
  /** SQLite errors, e.g. wa-sqlite's `SQLiteError`. */
  code?: string | number;
  /** HTTP/network error status, e.g. 401. */
  status?: number;
  cause?: SerializedRelayError | string;
  state: ErrorRelayState;
  relay?: { origin: string; sequence: number; errorState: ErrorRelayState; relayedAt: string };
}

const MAX_CAUSE_DEPTH = 5;

interface RelayContext {
  lossy: boolean;
}

function isErrorLike(value: unknown): value is Error {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { name?: unknown }).name === 'string' &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}

function missing(reason: unknown): SerializedRelayError {
  return {
    [RELAY_ERROR_MARKER]: true,
    name: 'PowerSyncMissingRejectionReason',
    message: `No rejection reason was provided (${reason}).`,
    state: 'missing'
  };
}

function serializeCause(value: unknown, depth: number, ctx: RelayContext): SerializedRelayError | string {
  if (isErrorLike(value)) {
    if (depth <= 0) {
      ctx.lossy = true;
      return '[Max depth reached]';
    }
    return serialize(value, depth, ctx);
  }
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  ctx.lossy = true;
  return `[Unserializable ${typeof value}]`;
}

function serialize(value: unknown, depth: number, ctx: RelayContext): SerializedRelayError {
  if (isSerializedRelayError(value)) return value;
  if (!isErrorLike(value)) return serializePlain(value);

  const source = value as Error & { code?: unknown; status?: unknown; cause?: unknown };
  const result: SerializedRelayError = {
    [RELAY_ERROR_MARKER]: true,
    name: source.name || 'Error',
    message: source.message,
    state: 'serialized'
  };

  const stack = source.stack;
  if (typeof stack === 'string') result.stack = stack;
  if (typeof source.code === 'string' || typeof source.code === 'number') result.code = source.code;
  if (typeof source.status === 'number') result.status = source.status;

  if (source.cause !== undefined) result.cause = serializeCause(source.cause, depth - 1, ctx);

  if (ctx.lossy && result.state !== 'missing') result.state = 'partial';
  return result;
}

/** Never stringifies an arbitrary object: it may hold credentials or a request payload. */
function serializePlain(value: unknown): SerializedRelayError {
  const printable = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  return {
    [RELAY_ERROR_MARKER]: true,
    name: typeof value === 'string' ? 'String' : 'Error',
    message: printable ? String(value) : 'Non-Error rejection',
    state: 'serialized'
  };
}

/**
 * Serializes a caught value into a clone-safe shape. Never throws and never
 * returns `undefined` — a missing rejection reason becomes `state: 'missing'`.
 */
export function serializeErrorForRelay(value: unknown): SerializedRelayError {
  try {
    if (value === undefined || value === null) return missing(value);
    return serialize(value, MAX_CAUSE_DEPTH, { lossy: false });
  } catch {
    return {
      [RELAY_ERROR_MARKER]: true,
      name: 'Error',
      message: 'Unable to serialize rejection reason',
      state: 'partial'
    };
  }
}

export function isSerializedRelayError(value: unknown): value is SerializedRelayError {
  return typeof value === 'object' && value !== null && (value as SerializedRelayError)[RELAY_ERROR_MARKER] === true;
}
