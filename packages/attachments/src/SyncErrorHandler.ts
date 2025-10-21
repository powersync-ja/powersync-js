import { AttachmentRecord } from './Schema.js';

/// If an operation fails and should not be retried, the attachment record is archived.
export abstract class SyncErrorHandler {
  /**
   * Handles a download error for a specific attachment.
   * @param attachment The `Attachment` that failed to be downloaded.
   * @param error The error encountered during the download operation.
   * @returns `true` if the operation should be retried, `false` if it should be archived.
   */
  abstract onDownloadError(attachment: AttachmentRecord, error: Error): Promise<boolean>;

  /**
   * Handles an upload error for a specific attachment.
   * @param attachment The `Attachment` that failed to be uploaded.
   * @param error The error encountered during the upload operation.
   * @returns `true` if the operation should be retried, `false` if it should be archived.
   */
  abstract onUploadError(attachment: AttachmentRecord, error: Error): Promise<boolean>;

  /**
   * Handles a delete error for a specific attachment.
   * @param attachment The `Attachment` that failed to be deleted.
   * @param error The error encountered during the delete operation.
   * @returns `true` if the operation should be retried, `false` if it should be archived.
   */
  abstract onDeleteError(attachment: AttachmentRecord, error: Error): Promise<boolean>;
}
