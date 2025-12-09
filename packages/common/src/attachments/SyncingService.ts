import { ILogger } from '../utils/Logger.js';
import { AttachmentContext } from './AttachmentContext.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { RemoteStorageAdapter } from './RemoteStorageAdapter.js';
import { AttachmentRecord, AttachmentState } from './Schema.js';
import { AttachmentErrorHandler } from './AttachmentErrorHandler.js';

/**
 * Orchestrates attachment synchronization between local and remote storage.
 * Handles uploads, downloads, deletions, and state transitions.
 */
export class SyncingService {
  context: AttachmentContext;
  localStorage: LocalStorageAdapter;
  remoteStorage: RemoteStorageAdapter;
  logger: ILogger;
  errorHandler?: AttachmentErrorHandler;

  constructor(
    context: AttachmentContext,
    localStorage: LocalStorageAdapter,
    remoteStorage: RemoteStorageAdapter,
    logger: ILogger,
    errorHandler?: AttachmentErrorHandler
  ) {
    this.context = context;
    this.localStorage = localStorage;
    this.remoteStorage = remoteStorage;
    this.logger = logger;
    this.errorHandler = errorHandler;
  }

  /**
   * Processes attachments based on their state (upload, download, or delete).
   * All updates are saved in a single batch after processing.
   * 
   * @param attachments - Array of attachment records to process
   * @returns Promise that resolves when all attachments have been processed and saved
   */
  async processAttachments(attachments: AttachmentRecord[]): Promise<void> {
    const updatedAttachments: AttachmentRecord[] = [];
    for (const attachment of attachments) {
      switch (attachment.state) {
        case AttachmentState.QUEUED_UPLOAD:
          const uploaded = await this.uploadAttachment(attachment);
          updatedAttachments.push(uploaded);
          break;
        case AttachmentState.QUEUED_DOWNLOAD:
          const downloaded = await this.downloadAttachment(attachment);
          updatedAttachments.push(downloaded);
          break;
        case AttachmentState.QUEUED_DELETE:
          const deleted = await this.deleteAttachment(attachment);
          updatedAttachments.push(deleted);
          break;

        default:
          break;
      }
    }

    await this.context.saveAttachments(updatedAttachments);
  }

  /**
   * Uploads an attachment from local storage to remote storage.
   * On success, marks as SYNCED. On failure, defers to error handler or archives.
   * 
   * @param attachment - The attachment record to upload
   * @returns Updated attachment record with new state
   * @throws Error if the attachment has no localUri
   */
  async uploadAttachment(attachment: AttachmentRecord): Promise<AttachmentRecord> {
    this.logger.info(`Uploading attachment ${attachment.filename}`);
    try {
      if (attachment.localUri == null) {
        throw new Error(`No localUri for attachment ${attachment.id}`);
      }

      const fileBlob = await this.localStorage.readFile(attachment.localUri);
      await this.remoteStorage.uploadFile(fileBlob, attachment);

      return {
        ...attachment,
        state: AttachmentState.SYNCED,
        hasSynced: true
      };
    } catch (error) {
      const shouldRetry = this.errorHandler?.onUploadError(attachment, error) ?? true;
      if (!shouldRetry) {
        return {
          ...attachment,
          state: AttachmentState.ARCHIVED
        };
      }

      return attachment;
    }
  }

  /**
   * Downloads an attachment from remote storage to local storage.
   * Retrieves the file, converts to base64, and saves locally.
   * On success, marks as SYNCED. On failure, defers to error handler or archives.
   * 
   * @param attachment - The attachment record to download
   * @returns Updated attachment record with local URI and new state
   */
  async downloadAttachment(attachment: AttachmentRecord): Promise<AttachmentRecord> {
    try {
      const fileData = await this.remoteStorage.downloadFile(attachment);

      const localUri = this.localStorage.getLocalUri(attachment.filename);
      await this.localStorage.saveFile(localUri, fileData);

      return {
        ...attachment,
        state: AttachmentState.SYNCED,
        localUri: localUri
      };
    } catch (error) {
      const shouldRetry = this.errorHandler?.onDownloadError(attachment, error) ?? true;
      if (!shouldRetry) {
        return {
          ...attachment,
          state: AttachmentState.ARCHIVED
        };
      }

      return attachment;
    }
  }

  /**
   * Deletes an attachment from both remote and local storage.
   * Removes the remote file, local file (if exists), and the attachment record.
   * On failure, defers to error handler or archives.
   * 
   * @param attachment - The attachment record to delete
   * @returns Updated attachment record
   */
  async deleteAttachment(attachment: AttachmentRecord): Promise<AttachmentRecord> {
    try {
      await this.remoteStorage.deleteFile(attachment);
      if (attachment.localUri) {
        await this.localStorage.deleteFile(attachment.localUri);
      }

      await this.context.deleteAttachment(attachment.id);

      return {
        ...attachment,
        state: AttachmentState.QUEUED_DELETE,
        localUri: null
      };
    } catch (error) {
      const shouldRetry = this.errorHandler?.onDeleteError(attachment, error) ?? true;
      if (!shouldRetry) {
        return {
          ...attachment,
          state: AttachmentState.ARCHIVED
        };
      }

      return attachment;
    }
  }

  /**
   * Performs cleanup of archived attachments by removing their local files and records.
   * Errors during local file deletion are logged but do not prevent record deletion.
   */
  async deleteArchivedAttachments(): Promise<boolean> {
    return await this.context.deleteArchivedAttachments(async (archivedAttachments) => {
      for (const attachment of archivedAttachments) {
        if (attachment.localUri) {
          try {
            await this.localStorage.deleteFile(attachment.localUri);
          } catch (error) {
            this.logger.error('Error deleting local file for archived attachment', error);
          }
        }
        await this.context.deleteAttachment(attachment.id);
      }
    });
  }
}
