import { ILogger } from '../utils/Logger.js';
import { AttachmentService } from './AttachmentService.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { RemoteStorageAdapter } from './RemoteStorageAdapter.js';
import { AttachmentRecord, AttachmentState } from './Schema.js';
import { AttachmentErrorHandler } from './AttachmentErrorHandler.js';
import { AttachmentContext } from './AttachmentContext.js';

/**
 * Orchestrates attachment synchronization between local and remote storage.
 * Handles uploads, downloads, deletions, and state transitions.
 */
export class SyncingService {
  private attachmentService: AttachmentService;
  private localStorage: LocalStorageAdapter;
  private remoteStorage: RemoteStorageAdapter;
  private logger: ILogger;
  private errorHandler?: AttachmentErrorHandler;

  constructor(
    attachmentService: AttachmentService,
    localStorage: LocalStorageAdapter,
    remoteStorage: RemoteStorageAdapter,
    logger: ILogger,
    errorHandler?: AttachmentErrorHandler
  ) {
    this.attachmentService = attachmentService;
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
   * @param context - Attachment context for database operations
   * @returns Promise that resolves when all attachments have been processed and saved
   */
  async processAttachments(attachments: AttachmentRecord[], context: AttachmentContext): Promise<void> {
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

    await context.saveAttachments(updatedAttachments);
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
      const shouldRetry = await this.errorHandler?.onUploadError(attachment, error) ?? true;
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
    this.logger.info(`Downloading attachment ${attachment.filename}`);
    try {
      const fileData = await this.remoteStorage.downloadFile(attachment);

      const localUri = this.localStorage.getLocalUri(attachment.filename);
      await this.localStorage.saveFile(localUri, fileData);

      return {
        ...attachment,
        state: AttachmentState.SYNCED,
        localUri: localUri,
        hasSynced: true
      };
    } catch (error) {
      const shouldRetry = await this.errorHandler?.onDownloadError(attachment, error) ?? true;
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

      await this.attachmentService.withContext(async (ctx) => {
        await ctx.deleteAttachment(attachment.id);
      });

      return {
        ...attachment,
        state: AttachmentState.ARCHIVED
      };
    } catch (error) {
      const shouldRetry = await this.errorHandler?.onDeleteError(attachment, error) ?? true;
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
  async deleteArchivedAttachments(context: AttachmentContext): Promise<boolean> {
    return await context.deleteArchivedAttachments(async (archivedAttachments) => {
      for (const attachment of archivedAttachments) {
        if (attachment.localUri) {
          try {
            await this.localStorage.deleteFile(attachment.localUri);
          } catch (error) {
            this.logger.error('Error deleting local file for archived attachment', error);
          }
        }
      }
    });
  }
}
