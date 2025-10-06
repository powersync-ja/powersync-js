import { ILogger } from '@powersync/common';
import { AttachmentContext } from './AttachmentContext.js';
import { EncodingType, LocalStorageAdapter } from './LocalStorageAdapter.js';
import { RemoteStorageAdapter } from './RemoteStorageAdapter.js';
import { AttachmentRecord, AttachmentState } from './Schema.js';
import { SyncErrorHandler } from './SyncErrorHandler.js';

export class StorageService {
  context: AttachmentContext;
  localStorage: LocalStorageAdapter;
  remoteStorage: RemoteStorageAdapter;
  logger: ILogger;
  errorHandler?: SyncErrorHandler;

  constructor(
    context: AttachmentContext,
    localStorage: LocalStorageAdapter,
    remoteStorage: RemoteStorageAdapter,
    logger: ILogger,
    errorHandler?: SyncErrorHandler
  ) {
    this.context = context;
    this.localStorage = localStorage;
    this.remoteStorage = remoteStorage;
    this.logger = logger;
    this.errorHandler = errorHandler;
  }

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
      const shouldRetry = this.errorHandler?.onUploadError(attachment, error) ?? false;
      if (!shouldRetry) {
        return {
          ...attachment,
          state: AttachmentState.ARCHIVED
        };
      }

      return attachment;
    }
  }

  async downloadAttachment(attachment: AttachmentRecord): Promise<AttachmentRecord> {
    try {
      const fileBlob = await this.remoteStorage.downloadFile(attachment);

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // remove the header from the result: 'data:*/*;base64,'
          resolve(reader.result?.toString().replace(/^data:.+;base64,/, '') || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileBlob);
      });
      const userDir = this.localStorage.getUserStorageDirectory();
      const localUri = `${userDir}${attachment.id}`;

      await this.localStorage.saveFile(localUri, base64Data);

      return {
        ...attachment,
        state: AttachmentState.SYNCED,
        localUri: localUri
      };
    } catch (error) {
      const shouldRetry = this.errorHandler?.onDownloadError(attachment, error) ?? false;
      if (!shouldRetry) {
        return {
          ...attachment,
          state: AttachmentState.ARCHIVED
        };
      }

      return attachment;
    }
  }

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
      const shouldRetry = this.errorHandler?.onDeleteError(attachment, error) ?? false;
      if (!shouldRetry) {
        return {
          ...attachment,
          state: AttachmentState.ARCHIVED
        };
      }

      return attachment;
    }
  }

  async deleteArchivedAttachments(): Promise<void> {
    const archivedAttachments = await this.context.getArchivedAttachments();
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
  }
}
