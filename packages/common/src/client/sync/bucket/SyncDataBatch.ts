import { SyncDataBucket } from './SyncDataBucket.js';

// TODO JSON

/**
 * @internal
 */
export class SyncDataBatch {
  static fromJSON(json: any) {
    return new SyncDataBatch(json.buckets.map((bucket: any) => SyncDataBucket.fromRow(bucket)));
  }

  constructor(public buckets: SyncDataBucket[]) {}
}
