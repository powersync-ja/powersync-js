import { PowerSyncControlCommand, SqliteBucketStorage } from '@powersync/web';

export class CapacitorBucketStorageAdapter extends SqliteBucketStorage {
  control(op: PowerSyncControlCommand, payload: string | Uint8Array | ArrayBuffer | null): Promise<string> {
    if (payload instanceof Uint8Array && (payload as any)['_isBuffer'] == true) {
      /**
       * The Buffer polyfill, used in @powersync/common, is a Uint8Array subclass which defines additional fields like
       * `_isBuffer` and `parent` on its `prototype`. The additional fields are serialized when passed through the native bridge.
       * The Capacitor Community SQLite lib expects a dictionarty of indexes to numerical bytes.
       * The additiona fields (which are not an index to numerical byte mapping) cause the parsing logic in the SQLite lib to throw an error:
       *  "Error in reading buffer".
       *
       * Re-wrapping the same backing buffer as a plain Uint8Array removes the Buffer subclass wrapper
       * while keeping the same underlying bytes. This creates a new view, not a byte copy, so the
       * overhead should be minimal.
       */
      payload = new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
    }

    return super.control(op, payload);
  }
}
