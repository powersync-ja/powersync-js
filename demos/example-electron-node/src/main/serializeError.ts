type ErrorWithCause = Error & { cause?: unknown };

/** Flatten errors before sending sync status through Electron's message ports. */
export function serializeError(error?: ErrorWithCause, seen = new Set<Error>()): ErrorWithCause | undefined {
  if (error === undefined) return undefined;

  const serialized: ErrorWithCause = { name: error.name, message: error.message, stack: error.stack };
  if (seen.has(error)) {
    serialized.cause = '[Circular error cause]';
    return serialized;
  }
  seen.add(error);

  const cause = error.cause;
  if (cause instanceof Error || cause instanceof DOMException) {
    serialized.cause = serializeError(cause, seen);
  } else if (cause !== undefined) {
    try {
      serialized.cause = structuredClone(cause);
    } catch {
      // Functions, symbols and other non-cloneable causes must not drop the status update.
      serialized.cause = '[Unserializable error cause]';
    }
  }
  return serialized;
}
