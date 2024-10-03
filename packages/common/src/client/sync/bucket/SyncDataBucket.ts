import { OpId } from './CrudEntry.js';
import { OplogEntry, OplogEntryJSON } from './OplogEntry.js';

export type SyncDataBucketJSON = {
  bucket: string;
  has_more?: boolean;
  after?: string;
  next_after?: string;
  data: OplogEntryJSON[];
};

export class SyncDataBucket {
  static fromRow(row: SyncDataBucketJSON) {
    return new SyncDataBucket(
      row.bucket,
      row.data.map((entry) => OplogEntry.fromRow(entry)),
      row.has_more ?? false,
      row.after,
      row.next_after
    );
  }

  constructor(
    public bucket: string,
    public data: OplogEntry[],
    /**
     * True if the response does not contain all the data for this bucket, and another request must be made.
     */
    public has_more: boolean,
    /**
     * The `after` specified in the request.
     */
    public after?: OpId,
    /**
     * Use this for the next request.
     */
    public next_after?: OpId
  ) {}

  toJSON(): SyncDataBucketJSON {
    return {
      bucket: this.bucket,
      has_more: this.has_more,
      after: this.after,
      next_after: this.next_after,
      data: this.data.map((entry) => entry.toJSON())
    };
  }
}
