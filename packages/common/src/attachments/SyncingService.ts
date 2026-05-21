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
 *
 * @internal
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
   *
   * Each attachment's I/O runs outside the attachment-service mutex, and the row's
   * state transition is persisted immediately after it completes. This keeps the
   * mutex available to concurrent `saveFile` / `deleteFile` / watched-attachment
   * processing while a batch is in flight, and means consumer queries against the
   * attachments queue see incremental progress instead of one atomic commit at the
   * end of the batch.
   *
   * @param attachments - Array of attachment records to process
   * @param options.withContext - Briefly acquires the attachment-service mutex.
   *                              Used to persist each row after its I/O completes
   *                              and to run the delete-row transaction.
   * @param options.isActive - Polled between attachments; when it returns `false`
   *                           the loop exits early. Used by `stopSync` to interrupt
   *                           a running batch within one attachment's processing
   *                           time.
   */
  async processAttachments(
    attachments: AttachmentRecord[],
    options: {
      withContext: <T>(callback: (context: AttachmentContext) => Promise<T>) => Promise<T>;
      isActive?: () => boolean;
    }
  ): Promise<void> {
    const { withContext, isActive } = options;
    this.logger.info(`Starting processAttachments with ${attachments.length} attachments`);

    for (const attachment of attachments) {
      if (isActive && !isActive()) {
        this.logger.info('Sync cancelled; stopping iteration early');
        return;
      }

      try {
        let updated: AttachmentRecord;
        switch (attachment.state) {
          case AttachmentState.QUEUED_UPLOAD:
            updated = await this.uploadAttachment(attachment);
            break;
          case AttachmentState.QUEUED_DOWNLOAD:
            updated = await this.downloadAttachment(attachment);
            break;
          case AttachmentState.QUEUED_DELETE:
            // `deleteAttachment` needs a context (it removes the row in a
            // transaction); briefly re-acquire the mutex for just this row.
            updated = await withContext((ctx) => this.deleteAttachment(attachment, ctx));
            break;
          default:
            continue;
        }

        await withContext((ctx) => ctx.saveAttachments([updated]));
      } catch (error) {
        this.logger.warn(`Error during sync for ${attachment.id}`, error);
      }
    }
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
      const shouldRetry = (await this.errorHandler?.onUploadError(attachment, error)) ?? true;
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
      const shouldRetry = (await this.errorHandler?.onDownloadError(attachment, error)) ?? true;
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
   * @param context - Attachment context for database operations
   * @returns Updated attachment record
   */
  async deleteAttachment(attachment: AttachmentRecord, context: AttachmentContext): Promise<AttachmentRecord> {
    try {
      await this.remoteStorage.deleteFile(attachment);
      if (attachment.localUri) {
        await this.localStorage.deleteFile(attachment.localUri);
      }

      await context.deleteAttachment(attachment.id);

      return {
        ...attachment,
        state: AttachmentState.ARCHIVED
      };
    } catch (error) {
      const shouldRetry = (await this.errorHandler?.onDeleteError(attachment, error)) ?? true;
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
