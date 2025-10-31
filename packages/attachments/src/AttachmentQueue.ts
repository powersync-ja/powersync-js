import { AbstractPowerSyncDatabase, DifferentialWatchedQuery, ILogger, Transaction } from '@powersync/common';
import { AttachmentContext } from './AttachmentContext.js';
import { AttachmentData, LocalStorageAdapter } from './LocalStorageAdapter.js';
import { RemoteStorageAdapter } from './RemoteStorageAdapter.js';
import { ATTACHMENT_TABLE, AttachmentRecord, AttachmentState } from './Schema.js';
import { SyncingService } from './SyncingService.js';
import { WatchedAttachmentItem } from './WatchedAttachmentItem.js';
import { AttachmentService } from './AttachmentService.js';

/**
 * AttachmentQueue manages the lifecycle and synchronization of attachments
 * between local and remote storage.
 * 
 * Provides automatic synchronization, upload/download queuing, attachment monitoring,
 * verification and repair of local files, and cleanup of archived attachments.
 */
export class AttachmentQueue {
  /** Timer for periodic synchronization operations */
  periodicSyncTimer?: ReturnType<typeof setInterval>;
  
  /** Context for managing attachment records in the database */
  context: AttachmentContext;
  
  /** Service for synchronizing attachments between local and remote storage */
  syncingService: SyncingService;
  
  /** Adapter for local file storage operations */
  localStorage: LocalStorageAdapter;
  
  /** Adapter for remote file storage operations */
  remoteStorage: RemoteStorageAdapter;
  
  /** @deprecated Directory path for storing attachments  */
  attachmentsDirectory?: string;
  
  /** Name of the database table storing attachment records */
  tableName?: string;
  
  /** Logger instance for diagnostic information */
  logger?: ILogger;
  
  /** Interval in milliseconds between periodic sync operations. Default: 30000 (30 seconds) */
  syncIntervalMs: number = 30 * 1000;
  
  /** Duration in milliseconds to throttle sync operations */
  syncThrottleDuration: number;
  
  /** Whether to automatically download remote attachments. Default: true */
  downloadAttachments: boolean = true;
  
  /** Maximum number of archived attachments to keep before cleanup. Default: 100 */
  archivedCacheLimit: number;
  
  /** Service for managing attachment-related database operations */
  attachmentService: AttachmentService;

  watchActiveAttachments: DifferentialWatchedQuery<AttachmentRecord>;

  /**
   * Creates a new AttachmentQueue instance.
   * 
   * @param options - Configuration options
   * @param options.db - PowerSync database instance
   * @param options.remoteStorage - Remote storage adapter for upload/download operations
   * @param options.localStorage - Local storage adapter for file persistence
   * @param options.watchAttachments - Callback for monitoring attachment changes in your data model
   * @param options.tableName - Name of the table to store attachment records. Default: 'ps_attachment_queue'
   * @param options.logger - Logger instance. Defaults to db.logger
   * @param options.syncIntervalMs - Interval between automatic syncs in milliseconds. Default: 30000
   * @param options.syncThrottleDuration - Throttle duration for sync operations in milliseconds. Default: 1000
   * @param options.downloadAttachments - Whether to automatically download remote attachments. Default: true
   * @param options.archivedCacheLimit - Maximum archived attachments before cleanup. Default: 100
   */
  constructor({
    db,
    localStorage,
    remoteStorage,
    watchAttachments,
    logger,
    tableName = ATTACHMENT_TABLE,
    syncIntervalMs = 30 * 1000,
    syncThrottleDuration = 1000,
    downloadAttachments = true,
    archivedCacheLimit = 100
  }: {
    db: AbstractPowerSyncDatabase;
    remoteStorage: RemoteStorageAdapter;
    localStorage: LocalStorageAdapter;
    watchAttachments: (onUpdate: (attachement: WatchedAttachmentItem[]) => Promise<void>) => void;
    tableName?: string;
    logger?: ILogger;
    syncIntervalMs?: number;
    syncThrottleDuration?: number;
    downloadAttachments?: boolean;
    archivedCacheLimit?: number;
  }) {
    this.context = new AttachmentContext(db, tableName, logger ?? db.logger);
    this.remoteStorage = remoteStorage;
    this.localStorage = localStorage;
    this.watchAttachments = watchAttachments;
    this.tableName = tableName;
    this.syncingService = new SyncingService(this.context, localStorage, remoteStorage, logger ?? db.logger);
    this.attachmentService = new AttachmentService(tableName, db);
    this.watchActiveAttachments = this.attachmentService.watchActiveAttachments();
    this.syncIntervalMs = syncIntervalMs;
    this.syncThrottleDuration = syncThrottleDuration;
    this.downloadAttachments = downloadAttachments;
    this.archivedCacheLimit = archivedCacheLimit;
  }

  /**
   * Callback function to watch for changes in attachment references in your data model.
   * 
   * This method should be implemented to monitor changes in your application's
   * data that reference attachments. When attachments are added, removed, or modified,
   * this callback should trigger the onUpdate function with the current set of attachments.
   * 
   * @param onUpdate - Callback to invoke when attachment references change
   * @throws Error indicating this method must be implemented by the user
   */
  watchAttachments(onUpdate: (attachement: WatchedAttachmentItem[]) => Promise<void>): void {
    throw new Error('watchAttachments should be implemented by the user of AttachmentQueue');
  }

  /**
   * Starts the attachment synchronization process.
   * 
   * This method:
   * - Stops any existing sync operations
   * - Sets up periodic synchronization based on syncIntervalMs
   * - Registers listeners for active attachment changes
   * - Processes watched attachments to queue uploads/downloads
   * - Handles state transitions for archived and new attachments
   */
  async startSync(): Promise<void> {
    if (this.attachmentService.watchActiveAttachments) {
      await this.stopSync();
      // re-create the watch after it was stopped
      this.watchActiveAttachments = this.attachmentService.watchActiveAttachments();
    }

    // Sync storage periodically
    this.periodicSyncTimer = setInterval(async () => {
      await this.syncStorage();
    }, this.syncIntervalMs);

    // Sync storage when there is a change in active attachments
    this.watchActiveAttachments.registerListener({
      onDiff: async () => {
        await this.syncStorage();
      }
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

  /**
   * Synchronizes all active attachments between local and remote storage.
   * 
   * This is called automatically at regular intervals when sync is started,
   * but can also be called manually to trigger an immediate sync.
   */
  async syncStorage(): Promise<void> {
    const activeAttachments = await this.context.getActiveAttachments();
    await this.localStorage.initialize();
    await this.syncingService.processAttachments(activeAttachments);
    await this.syncingService.deleteArchivedAttachments();
  }

  /**
   * Stops the attachment synchronization process.
   * 
   * Clears the periodic sync timer and closes all active attachment watchers.
   */
  async stopSync(): Promise<void> {
    clearInterval(this.periodicSyncTimer);
    this.periodicSyncTimer = undefined;
    await this.watchActiveAttachments.close();
  }

  /**
   * Saves a file to local storage and queues it for upload to remote storage.
   * 
   * @param options - File save options
   * @param options.data - The file data as ArrayBuffer, Blob, or base64 string
   * @param options.fileExtension - File extension (e.g., 'jpg', 'pdf')
   * @param options.mediaType - MIME type of the file (e.g., 'image/jpeg')
   * @param options.metaData - Optional metadata to associate with the attachment
   * @param options.id - Optional custom ID. If not provided, a UUID will be generated
   * @param options.updateHook - Optional callback to execute additional database operations
   *                             within the same transaction as the attachment creation
   * @returns Promise resolving to the created attachment record
   */
  async saveFile({
    data,
    fileExtension,
    mediaType,
    metaData,
    id,
    updateHook
  }: {
    // TODO: create a dedicated type for data
    data: AttachmentData;
    fileExtension: string;
    mediaType?: string;
    metaData?: string;
    id?: string;
    updateHook?: (transaction: Transaction, attachment: AttachmentRecord) => void;
  }): Promise<AttachmentRecord> {
    const resolvedId = id ?? (await this.context.db.get<{ id: string }>('SELECT uuid() as id')).id;
    const filename = `${resolvedId}.${fileExtension}`;
    const localUri = this.localStorage.getLocalUri(filename);
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
      updateHook?.(tx, attachment);
      this.context.upsertAttachment(attachment, tx);
    });

    return attachment;
  }

  /**
   * Verifies the integrity of all attachment records and repairs inconsistencies.
   * 
   * This method checks each attachment record against the local filesystem and:
   * - Updates localUri if the file exists at a different path
   * - Archives attachments with missing local files that haven't been uploaded
   * - Requeues synced attachments for download if their local files are missing
   */
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

      const newLocalUri = this.localStorage.getLocalUri(attachment.filename);
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
