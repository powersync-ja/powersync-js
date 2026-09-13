import { CompiledQuery } from '@powersync/common';

/**
 * Stable identity for a query: SQL + NUL + serialized parameters. NUL cannot appear in
 * SQL text, so the two fields never collide. Exposed to plugins via their query
 * context; only compared for equality, never parsed.
 *
 * @internal
 */
export const SIGNATURE_SEPARATOR = '\0';

export function querySignature(compiled: CompiledQuery): string {
  let parameters: string;
  try {
    parameters = JSON.stringify(compiled.parameters ?? []);
  } catch {
    parameters = String(compiled.parameters);
  }
  return `${compiled.sql}${SIGNATURE_SEPARATOR}${parameters}`;
}
