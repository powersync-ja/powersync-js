import { PowerSyncControlCommand, SqliteBucketStorage } from '@powersync/common';

export class ReactNativeBucketStorageAdapter extends SqliteBucketStorage {
  control(op: PowerSyncControlCommand, payload: string | ArrayBuffer | null): Promise<string> {
    if (payload != null && typeof payload != 'string') {
      // For some reason, we need to copy array buffers for RNQS to recognize them. We're doing that here because we
      // don't want to pay the cost of a copy on platforms where it's not necessary.
      payload = new Uint8Array(payload).buffer;
    }

    return super.control(op, payload);
  }
}
