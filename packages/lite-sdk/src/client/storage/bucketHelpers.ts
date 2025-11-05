import type { ProtocolOplogData } from '@powersync/service-core';

/**
 * Construct key from object_type, object_id, and subkey
 * Format: "{object_type}/{object_id}/{subkey}" or empty string if object_type/object_id are missing
 */
export function constructKey(
  objectType: string | undefined,
  objectId: string | undefined,
  subkey: string | undefined
): string {
  if (objectType && objectId) {
    const subkeyStr = subkey ?? 'null';
    return `${objectType}/${objectId}/${subkeyStr}`;
  }
  return '';
}

/**
 * Convert ProtocolOplogData to JSON string or null
 */
export function toStringOrNull(value: ProtocolOplogData | null | undefined): string | null {
  return value ? JSON.stringify(value) : null;
}

