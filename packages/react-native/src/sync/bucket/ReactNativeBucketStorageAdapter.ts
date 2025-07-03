import { PowerSyncControlCommand, SqliteBucketStorage } from '@powersync/common';

export class ReactNativeBucketStorageAdapter extends SqliteBucketStorage {
  control(op: PowerSyncControlCommand, payload: string | Uint8Array | ArrayBuffer | null): Promise<string> {
    if (payload instanceof Uint8Array) {
      // RNQS doesn't accept Uint8Array arguments - convert to ArrayBuffer first.
      payload = uint8ArrayToArrayBuffer(payload);
    }

    return super.control(op, payload);
  }
}

function uint8ArrayToArrayBuffer(array: Uint8Array): ArrayBuffer {
  // SharedArrayBuffer isn't defined on ReactNative, so don't need to cater for that.
  const arrayBuffer = array.buffer as ArrayBuffer;
  if (array.byteOffset == 0 && array.byteLength == arrayBuffer.byteLength) {
    // No copying needed - can use ArrayBuffer as-is
    return arrayBuffer;
  } else {
    // Need to make a copy
    return arrayBuffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
  }
}
