// Clone-safe representation of errors crossing a worker boundary.

export const RELAY_ERROR_MARKER = '__powersyncError';

export type ErrorRelayState = 'serialized' | 'partial' | 'missing';

/** Structurally Error-like, but `instanceof Error` is false. */
export interface SerializedRelayError {
  [RELAY_ERROR_MARKER]: true;
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  status?: number;
  cause?: SerializedRelayError | string;
  state: ErrorRelayState;
  properties?: Record<string, string | number | boolean | null>;
  relay?: { origin: string; sequence: number; errorState: ErrorRelayState; relayedAt: string };
}

const MAX_CAUSE_DEPTH = 5;
const MAX_STRING_LENGTH = 1000;
const EXTRA_DIAGNOSTIC_KEYS = ['statusCode', 'errno'] as const;

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

function bound(value: string, max = MAX_STRING_LENGTH): string {
  return value.length > max ? `${value.slice(0, max)}…[+${value.length - max} chars]` : value;
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
  if (typeof value === 'string') return bound(value);
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return String(value);
  ctx.lossy = true;
  return `[Unserializable ${typeof value}]`;
}

function serialize(value: unknown, depth: number, ctx: RelayContext): SerializedRelayError {
  if (isSerializedRelayError(value)) return { ...value };
  if (!isErrorLike(value)) return serializePlain(value);

  const source = value as Error & { code?: unknown; status?: unknown; cause?: unknown; [key: string]: unknown };
  const result: SerializedRelayError = {
    [RELAY_ERROR_MARKER]: true,
    name: source.name || 'Error',
    message: bound(source.message),
    state: 'serialized'
  };

  const stack = source.stack;
  if (typeof stack === 'string') {
    if (stack.length > MAX_STRING_LENGTH * 4) ctx.lossy = true;
    result.stack = bound(stack, MAX_STRING_LENGTH * 4);
  }
  if (typeof source.code === 'string' || typeof source.code === 'number') result.code = source.code;
  if (typeof source.status === 'number') result.status = source.status;

  const properties: Record<string, string | number | boolean | null> = {};
  for (const key of EXTRA_DIAGNOSTIC_KEYS) {
    const raw = source[key];
    if (raw === null || typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      properties[key] = raw as string | number | boolean | null;
    }
  }
  if (Object.keys(properties).length > 0) result.properties = properties;

  if (source.cause !== undefined) result.cause = serializeCause(source.cause, depth - 1, ctx);

  if (ctx.lossy && result.state !== 'missing') result.state = 'partial';
  return result;
}

/**
 * Never stringifies the rejected value: an arbitrary object may hold credentials
 * or a request payload, so only its `message` is relayed.
 */
function serializePlain(value: unknown): SerializedRelayError {
  const printable = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  const result: SerializedRelayError = {
    [RELAY_ERROR_MARKER]: true,
    name: typeof value === 'string' ? 'String' : 'Error',
    message: printable ? bound(String(value)) : 'Non-Error rejection',
    state: 'serialized'
  };

  if (!printable && typeof value === 'object' && value !== null) {
    const source = value as { name?: unknown; message?: unknown; code?: unknown; status?: unknown };
    if (typeof source.message === 'string') result.message = bound(source.message);
    if (typeof source.name === 'string') result.name = source.name;
    if (typeof source.code === 'string' || typeof source.code === 'number') result.code = source.code;
    if (typeof source.status === 'number') result.status = source.status;
  }

  return result;
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
