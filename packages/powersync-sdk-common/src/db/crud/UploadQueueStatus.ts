export class UploadQueueStats {
  constructor(public count: number, public size: number = null) {}

  toString() {
    if (this.size == null) {
      return `UploadQueueStats<count:${this.count}>`;
    } else {
      return `UploadQueueStats<count: $count size: ${this.size / 1024}kB>`;
    }
  }
}
