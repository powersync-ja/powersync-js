export class UploadQueueStats {
  constructor(
    /**
     * Number of records in the upload queue.
     */
    public count: number,
    /**
     * Size of the upload queue in bytes.
     */
    public size: number | null = null
  ) {}

  toString() {
    if (this.size == null) {
      return `UploadQueueStats<count:${this.count}>`;
    } else {
      return `UploadQueueStats<count: $count size: ${this.size / 1024}kB>`;
    }
  }
}
