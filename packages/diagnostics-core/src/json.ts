/**
 * Plain JSON values, as everything that crosses the protocol is (see `shapes.ts`).
 *
 * Declared here rather than borrowed from an SDK so the main entrypoint keeps importing nothing from
 * any SDK package. An SDK's own parameter types are structurally compatible with these.
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** A plain object: not null, not an array. Values are not inspected. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether every value of a record is a string. */
export function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/**
 * Parses JSON text, returning `undefined` for text that is not JSON at all. Anything `JSON.parse`
 * produces is a {@link JsonValue}.
 */
export function parseJson(text: string): JsonValue | undefined {
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return undefined;
  }
}

/** Parses JSON text that should hold an object; null when it holds anything else or is not JSON. */
export function parseJsonObject(text: string): JsonObject | null {
  const parsed = parseJson(text);
  return isRecord(parsed) ? (parsed as JsonObject) : null;
}
