import { AttachmentRecord } from './Schema.js';

/**
 * SyncErrorHandler provides custom error handling for attachment sync operations.
 * Implementations determine whether failed operations should be retried or archived.
 */
export interface AttachmentErrorHandler {
  /**
   * Handles a download error for a specific attachment.
   * @param attachment The attachment that failed to download
   * @param error The error encountered during the download
   * @returns `true` to retry the operation, `false` to archive the attachment
   */
  onDownloadError(attachment: AttachmentRecord, error: Error): Promise<boolean>;

  /**
   * Handles an upload error for a specific attachment.
   * @param attachment The attachment that failed to upload
   * @param error The error encountered during the upload
   * @returns `true` to retry the operation, `false` to archive the attachment
   */
  onUploadError(attachment: AttachmentRecord, error: Error): Promise<boolean>;

  /**
   * Handles a delete error for a specific attachment.
   * @param attachment The attachment that failed to delete
   * @param error The error encountered during the delete
   * @returns `true` to retry the operation, `false` to archive the attachment
   */
  onDeleteError(attachment: AttachmentRecord, error: Error): Promise<boolean>;
}
