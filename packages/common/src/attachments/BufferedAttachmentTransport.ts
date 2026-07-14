import { AttachmentTransportAdapter, LocatedAttachmentRecord } from './AttachmentTransportAdapter.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { RemoteStorageAdapter } from './RemoteStorageAdapter.js';

/**
 * Default {@link AttachmentTransportAdapter}, composing the local and remote
 * storage adapters.
 *
 * The full file body is materialized as an `ArrayBuffer` in JS memory between the
 * two adapter calls. This is fine for small files but can cause memory pressure on
 * large ones — environments that support native transfer should provide a custom
 * transport instead.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class BufferedAttachmentTransport implements AttachmentTransportAdapter {
  constructor(
    private localStorage: LocalStorageAdapter,
    private remoteStorage: RemoteStorageAdapter
  ) {}

  async upload(attachment: LocatedAttachmentRecord): Promise<void> {
    const fileData = await this.localStorage.readFile(attachment.localUri);
    await this.remoteStorage.uploadFile(fileData, attachment);
  }

  async download(attachment: LocatedAttachmentRecord): Promise<void> {
    const fileData = await this.remoteStorage.downloadFile(attachment);
    await this.localStorage.saveFile(attachment.localUri, fileData);
  }
}
