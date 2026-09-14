import { CompiledQuery } from '@powersync/common';

/**
 * Stable identity for a query: SQL + NUL + serialized parameters. NUL cannot appear in
 * SQL text, so the two fields never collide. Exposed to plugins via their query
 * context; only compared for equality, never parsed.
 *
 * @internal
 */
export const SIGNATURE_SEPARATOR = '\0';

/**
 * Distinguishes successive unserializable parameter sets. `String(parameters)` is not
 * safe here: two different cyclic (or BigInt-carrying) parameter arrays both stringify
 * to `[object Object]`-ish text and would share a signature, so a cache keyed on it
 * could serve one query another's rows.
 */
let unserializableCounter = 0;

export function querySignature(compiled: CompiledQuery): string {
  let parameters: string;
  try {
    parameters = JSON.stringify(compiled.parameters ?? []);
    if (typeof parameters === 'undefined') {
      throw new TypeError('parameters serialized to undefined');
    }
  } catch {
    // A signature no other query can ever reproduce — including this same query on its
    // next compile. Plugins keyed on the signature therefore always miss for
    // unserializable parameters, which is the safe outcome.
    parameters = `${SIGNATURE_SEPARATOR}unserializable:${++unserializableCounter}`;
  }
  return `${compiled.sql}${SIGNATURE_SEPARATOR}${parameters}`;
}
