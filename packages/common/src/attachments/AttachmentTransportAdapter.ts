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
 * AttachmentTransportAdapter models the movement of an attachment's bytes between
 * local storage and remote storage as a single operation.
 *
 * A transport owns the entire transfer, letting implementations pick the most
 * efficient mechanism available (buffer, stream, or a platform-native file-URI
 * upload/download API). On platforms like React Native this allows large files to
 * be transferred without ever materializing them in the JS heap.
 *
 * {@link BufferedAttachmentTransport} is the default, composing the local and
 * remote storage adapters.
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
}
