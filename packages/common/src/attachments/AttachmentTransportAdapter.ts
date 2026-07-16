import { AttachmentRecord } from './Schema.js';

/**
 * An {@link AttachmentRecord} that is guaranteed to have a `localUri`.
 *
 * The syncing service assigns `localUri` before invoking a transport download,
 * so implementations always receive both the metadata and the destination path.
 *
 * @alpha
 */
export type LocatedAttachmentRecord = AttachmentRecord & { localUri: string };

/**
 * AttachmentTransportAdapter owns all remote-side operations for an attachment —
 * transfer (upload/download) and delete — as single operations.
 *
 * A transport owns the entire transfer, letting implementations pick the most
 * efficient mechanism available (buffer, stream, or a platform-native file-URI
 * upload/download API). On platforms like React Native this allows large files to
 * be transferred without ever materializing them in the JS heap.
 *
 * {@link BufferedAttachmentTransport} is the default, composing the local and
 * remote storage adapters. Provide a custom transport (via
 * `AttachmentQueue`'s `transportAdapter` option) to own the whole remote side; in
 * that case a separate `remoteStorage` is not required.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export interface AttachmentTransportAdapter {
  /**
   * Uploads the attachment's local file to remote storage.
   * @param attachment - The attachment to upload. `localUri` points at the source file.
   */
  upload(attachment: LocatedAttachmentRecord): Promise<void>;

  /**
   * Downloads the remote file into `attachment.localUri`.
   * @param attachment - The attachment to download. `localUri` is the destination path,
   *                      assigned by the syncing service before this call.
   */
  download(attachment: LocatedAttachmentRecord): Promise<void>;

  /**
   * Deletes the attachment's file from remote storage. Local file removal is handled
   * separately by the syncing service.
   * @param attachment - The attachment to delete.
   */
  delete(attachment: AttachmentRecord): Promise<void>;
}
