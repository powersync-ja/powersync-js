import type { StreamSubscription } from './client.js';

/** Snapshot JSON values and canonicalize keys so parameter property order is irrelevant. */
export function normalizeSubscriptions(streams: readonly StreamSubscription[]) {
  const result = new Map<string, StreamSubscription>();
  for (const stream of streams) {
    if (!stream || typeof stream.name !== 'string' || !stream.name)
      throw new Error('A subscription must have a stream name');
    const value = JSON.parse(
      JSON.stringify({
        name: stream.name,
        parameters: stream.parameters ?? null,
        priority: stream.priority ?? null
      })
    );
    const key = JSON.stringify(value, (_key, item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? Object.fromEntries(
            Object.keys(item)
              .sort()
              .map((key) => [key, item[key]])
          )
        : item
    );
    result.set(key, {
      name: value.name,
      parameters: value.parameters ?? undefined,
      priority: value.priority ?? undefined
    });
  }
  return result;
}
