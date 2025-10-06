import { AbstractPowerSyncDatabase, ILogger } from '@powersync/common';
import { AttachmentContext } from './AttachmentContext.js';
import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { RemoteStorageAdapter } from './RemoteStorageAdapter.js';
import { AttachmentRecord, AttachmentState } from './Schema.js';
import { StorageService } from './StorageService.js';
import { WatchedAttachmentItem } from './WatchedAttachmentItem.js';

export class AttachmentQueue {
  periodicSyncTimer?: ReturnType<typeof setInterval>;
  syncInterval: number = 30 * 1000;
  context: AttachmentContext;
  storageService: StorageService;
  localStorage: LocalStorageAdapter;
  remoteStorage: RemoteStorageAdapter;
  downloadAttachments: boolean = true;
  watchActiveAbortController?: AbortController;

  constructor({
    db,
    localStorage,
    remoteStorage,
    watchAttachments,
    tableName,
    logger,
    options
  }: {
    db: AbstractPowerSyncDatabase;
    remoteStorage: RemoteStorageAdapter;
    localStorage: LocalStorageAdapter;
    watchAttachments?: (onUpdate: (attachement: WatchedAttachmentItem[]) => void) => void;
    tableName?: string;
    logger?: ILogger;
    options?: { syncInterval?: number; downloadAttachments?: boolean };
  }) {
    this.context = new AttachmentContext(db, tableName, logger ?? db.logger);
    this.storageService = new StorageService(this.context, localStorage, remoteStorage, logger ?? db.logger);
    if (options?.syncInterval != null) {
      this.syncInterval = options.syncInterval;
    }
    if (options?.downloadAttachments != null) {
      this.downloadAttachments = options.downloadAttachments;
    }

    this.watchAttachments = watchAttachments ?? this.watchAttachments;
  }

  watchAttachments(onUpdate: (attachement: WatchedAttachmentItem[]) => void): void {
    throw new Error('watchAttachments not implemented');
  }

  async startSync(): Promise<void> {
    await this.stopSync();

    // Sync storage periodically
    this.periodicSyncTimer = setInterval(async () => {
      await this.syncStorage();
    }, this.syncInterval);

    // Sync storage when there is a change in active attachments
    this.watchActiveAbortController = this.context.watchActiveAttachments(async () => {
      await this.syncStorage();
    });

    // Process attachments when there is a change in watched attachments
    this.watchAttachments(async (watchedAttachments) => {
      // Need to get all the attachments which are tracked in the DB.
      // We might need to restore an archived attachment.
      const currentAttachments = await this.context.getAttachments();
      const attachmentUpdates: AttachmentRecord[] = [];

      for (const watchedAttachment of watchedAttachments) {
        const existingQueueItem = currentAttachments.find((a) => a.id === watchedAttachment.id);
        if (!existingQueueItem) {
          // Item is watched but not in the queue yet. Need to add it.

          if (!this.downloadAttachments) {
            continue;
          }

          const filename = `${watchedAttachment.id}.${watchedAttachment.fileExtension}`;

          attachmentUpdates.push({
            id: watchedAttachment.id,
            filename,
            state: AttachmentState.QUEUED_DOWNLOAD,
            hasSynced: false,
            metaData: watchedAttachment.metaData
          });
          continue;
        }

        if (existingQueueItem.state === AttachmentState.ARCHIVED) {
          // The attachment is present again. Need to queue it for sync.
          // We might be able to optimize this in future
          if (existingQueueItem.hasSynced === true) {
            // No remote action required, we can restore the record (avoids deletion)
            attachmentUpdates.push({
              ...existingQueueItem,
              state: AttachmentState.SYNCED
            });
          } else {
            // The localURI should be set if the record was meant to be downloaded
            // and hasSynced is false then
            // it must be an upload operation
            const newState =
              existingQueueItem.localUri == null ? AttachmentState.QUEUED_DOWNLOAD : AttachmentState.QUEUED_UPLOAD;

            attachmentUpdates.push({
              ...existingQueueItem,
              state: newState
            });
          }
        }
      }

      for (const attachment of currentAttachments) {
        const notInWatchedItems = watchedAttachments.find((i) => i.id === attachment.id) == null;
        if (notInWatchedItems) {
          switch (attachment.state) {
            case AttachmentState.QUEUED_DELETE:
            case AttachmentState.QUEUED_UPLOAD:
              // Only archive if it has synced
              if (attachment.hasSynced === true) {
                attachmentUpdates.push({
                  ...attachment,
                  state: AttachmentState.ARCHIVED
                });
              }
              break;
            default:
              // Archive other states such as QUEUED_DOWNLOAD
              attachmentUpdates.push({
                ...attachment,
                state: AttachmentState.ARCHIVED
              });
          }
        }
      }

      if (attachmentUpdates.length > 0) {
        await this.context.saveAttachments(attachmentUpdates);
      }
    });
  }

  // Sync storage with all active attachments
  async syncStorage(): Promise<void> {
    const activeAttachments = await this.context.getActiveAttachments();
    await this.localStorage.initialize();
    await this.storageService.processAttachments(activeAttachments);
    await this.storageService.deleteArchivedAttachments();
  }

  async stopSync(): Promise<void> {
    clearInterval(this.periodicSyncTimer);
    this.periodicSyncTimer = undefined;
    this.watchActiveAbortController?.abort();
  }

  getLocalUri(filePath: string): string {
    return `${this.localStorage.getUserStorageDirectory()}/${filePath}`;
  }

  async saveFile({
    data,
    fileExtension,
    mediaType,
    metaData,
    id
  }: {
    data: ArrayBuffer | Blob | string;
    fileExtension: string;
    mediaType?: string;
    metaData?: string;
    id?: string;
  }): Promise<AttachmentRecord> {
    const resolvedId = id ?? (await this.context.db.get<{ id: string }>('SELECT uuid() as id')).id;
    const filename = `${resolvedId}.${fileExtension}`;
    const localUri = this.getLocalUri(filename);
    const size = await this.localStorage.saveFile(localUri, data);

    const attachment: AttachmentRecord = {
      id: resolvedId,
      filename,
      mediaType,
      localUri,
      state: AttachmentState.QUEUED_UPLOAD,
      hasSynced: false,
      size,
      timestamp: new Date().getTime(),
      metaData
    };

    await this.context.db.writeTransaction(async (tx) => {
      this.context.upsertAttachment(attachment, tx);
    });

    return attachment;
  }

  verifyAttachments = async (): Promise<void> => {
    const attachments = await this.context.getAttachments();
    const updates: AttachmentRecord[] = [];

    for (const attachment of attachments) {
      if (attachment.localUri == null) {
        continue;
      }

      const exists = await this.localStorage.fileExists(attachment.localUri);
      if (exists) {
        // The file exists, this is correct
        continue;
      }

      const newLocalUri = this.getLocalUri(attachment.filename);
      const newExists = await this.localStorage.fileExists(newLocalUri);
      if (newExists) {
        // The file exists but the localUri is broken, lets update it.
        updates.push({
          ...attachment,
          localUri: newLocalUri
        });
      } else if (attachment.state === AttachmentState.QUEUED_UPLOAD || attachment.state === AttachmentState.ARCHIVED) {
        // The file must have been removed from the local storage before upload was completed
        updates.push({
          ...attachment,
          state: AttachmentState.ARCHIVED,
          localUri: undefined // Clears the value
        });
      } else if (attachment.state === AttachmentState.SYNCED) {
        // The file was downloaded, but removed - trigger redownload
        updates.push({
          ...attachment,
          state: AttachmentState.QUEUED_DOWNLOAD
        });
      }
    }

    await this.context.saveAttachments(updates);
  };
}
