import { AbstractPowerSyncDatabase } from '../client/AbstractPowerSyncDatabase.js';
import { DEFAULT_WATCH_THROTTLE_MS } from '../client/watched/WatchedQuery.js';
import { DifferentialWatchedQuery } from '../client/watched/processors/DifferentialQueryProcessor.js';
import { ILogger } from '../utils/Logger.js';
import { Transaction } from '../db/DBAdapter.js';
import { AttachmentData, LocalStorageAdapter } from './LocalStorageAdapter.js';
import { RemoteStorageAdapter } from './RemoteStorageAdapter.js';
import { ATTACHMENT_TABLE, AttachmentRecord, AttachmentState } from './Schema.js';
import { SyncingService } from './SyncingService.js';
import { WatchedAttachmentItem } from './WatchedAttachmentItem.js';
import { AttachmentService } from './AttachmentService.js';
import { AttachmentErrorHandler } from './AttachmentErrorHandler.js';

/**
 * AttachmentQueue manages the lifecycle and synchronization of attachments
 * between local and remote storage.
 * Provides automatic synchronization, upload/download queuing, attachment monitoring,
 * verification and repair of local files, and cleanup of archived attachments.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class AttachmentQueue {
  /** Timer for periodic synchronization operations */
  private periodicSyncTimer?: ReturnType<typeof setInterval>;

  /** Service for synchronizing attachments between local and remote storage */
  private readonly syncingService: SyncingService;

  /** Adapter for local file storage operations */
  readonly localStorage: LocalStorageAdapter;

  /** Adapter for remote file storage operations */
  readonly remoteStorage: RemoteStorageAdapter;

  /**
   * Callback function to watch for changes in attachment references in your data model.
   *
   * This should be implemented by the user of AttachmentQueue to monitor changes in your application's
   * data that reference attachments. When attachments are added, removed, or modified,
   * this callback should trigger the onUpdate function with the current set of attachments.
   */
  private readonly watchAttachments: (
    onUpdate: (attachment: WatchedAttachmentItem[]) => Promise<void>,
    signal: AbortSignal
  ) => void;

  /** Name of the database table storing attachment records */
  readonly tableName: string;

  /** Logger instance for diagnostic information */
  readonly logger: ILogger;

  /** Interval in milliseconds between periodic sync operations. Default: 30000 (30 seconds) */
  readonly syncIntervalMs: number = 30 * 1000;

  /** Duration in milliseconds to throttle sync operations */
  readonly syncThrottleDuration: number;

  /** Whether to automatically download remote attachments. Default: true */
  readonly downloadAttachments: boolean = true;

  /** Maximum number of archived attachments to keep before cleanup. Default: 100 */
  readonly archivedCacheLimit: number;

  /** Service for managing attachment-related database operations */
  private readonly attachmentService: AttachmentService;

  /** PowerSync database instance */
  private readonly db: AbstractPowerSyncDatabase;

  /** Cleanup function for status change listener */
  private statusListenerDispose?: () => void;

  private watchActiveAttachments: DifferentialWatchedQuery<AttachmentRecord>;

  private watchAttachmentsAbortController: AbortController;

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
    syncThrottleDuration = DEFAULT_WATCH_THROTTLE_MS,
    downloadAttachments = true,
    archivedCacheLimit = 100,
    errorHandler
  }: {
    db: AbstractPowerSyncDatabase;
    remoteStorage: RemoteStorageAdapter;
    localStorage: LocalStorageAdapter;
    watchAttachments: (onUpdate: (attachment: WatchedAttachmentItem[]) => Promise<void>, signal: AbortSignal) => void;
    tableName?: string;
    logger?: ILogger;
    syncIntervalMs?: number;
    syncThrottleDuration?: number;
    downloadAttachments?: boolean;
    archivedCacheLimit?: number;
    errorHandler?: AttachmentErrorHandler;
  }) {
    this.db = db;
    this.remoteStorage = remoteStorage;
    this.localStorage = localStorage;
    this.watchAttachments = watchAttachments;
    this.tableName = tableName;
    this.syncIntervalMs = syncIntervalMs;
    this.syncThrottleDuration = syncThrottleDuration;
    this.archivedCacheLimit = archivedCacheLimit;
    this.downloadAttachments = downloadAttachments;
    this.logger = logger ?? db.logger;
    this.attachmentService = new AttachmentService(db, this.logger, tableName, archivedCacheLimit);
    this.syncingService = new SyncingService(
      this.attachmentService,
      localStorage,
      remoteStorage,
      this.logger,
      errorHandler
    );
  }

  /**
   * Generates a new attachment ID using a SQLite UUID function.
   *
   * @returns Promise resolving to the new attachment ID
   */
  async generateAttachmentId(): Promise<string> {
    return this.db.get<{ id: string }>('SELECT uuid() as id').then((row) => row.id);
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
    await this.stopSync();

    this.watchActiveAttachments = this.attachmentService.watchActiveAttachments({
      throttleMs: this.syncThrottleDuration
    });

    // immediately invoke the sync storage to initialize local storage
    await this.localStorage.initialize();

    await this.verifyAttachments();

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

    this.statusListenerDispose = this.db.registerListener({
      statusChanged: (status) => {
        if (status.connected) {
          // Device came online, process attachments immediately
          this.syncStorage().catch((error) => {
            this.logger.error('Error syncing storage on connection:', error);
          });
        }
      }
    });

    this.watchAttachmentsAbortController = new AbortController();
    const signal = this.watchAttachmentsAbortController.signal;

    // Process attachments when there is a change in watched attachments
    this.watchAttachments(async (watchedAttachments) => {
      // Skip processing if sync has been stopped
      if (signal.aborted) {
        return;
      }

      await this.attachmentService.withContext(async (ctx) => {
        // Need to get all the attachments which are tracked in the DB.
        // We might need to restore an archived attachment.
        const currentAttachments = await ctx.getAttachments();
        const attachmentUpdates: AttachmentRecord[] = [];

        for (const watchedAttachment of watchedAttachments) {
          const existingQueueItem = currentAttachments.find((a) => a.id === watchedAttachment.id);
          if (!existingQueueItem) {
            // Item is watched but not in the queue yet. Need to add it.
            if (!this.downloadAttachments) {
              continue;
            }

            const filename = watchedAttachment.filename ?? `${watchedAttachment.id}.${watchedAttachment.fileExtension}`;

            attachmentUpdates.push({
              id: watchedAttachment.id,
              filename,
              state: AttachmentState.QUEUED_DOWNLOAD,
              hasSynced: false,
              metaData: watchedAttachment.metaData,
              timestamp: new Date().getTime()
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
              // The localURI should be set if the record was meant to be uploaded
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
          await ctx.saveAttachments(attachmentUpdates);
        }
      });
    }, signal);
  }

  /**
   * Synchronizes all active attachments between local and remote storage.
   *
   * This is called automatically at regular intervals when sync is started,
   * but can also be called manually to trigger an immediate sync.
   */
  async syncStorage(): Promise<void> {
    await this.attachmentService.withContext(async (ctx) => {
      const activeAttachments = await ctx.getActiveAttachments();
      await this.localStorage.initialize();
      await this.syncingService.processAttachments(activeAttachments, ctx);
      await this.syncingService.deleteArchivedAttachments(ctx);
    });
  }

  /**
   * Stops the attachment synchronization process.
   *
   * Clears the periodic sync timer and closes all active attachment watchers.
   */
  async stopSync(): Promise<void> {
    clearInterval(this.periodicSyncTimer);
    this.periodicSyncTimer = undefined;
    if (this.watchActiveAttachments) await this.watchActiveAttachments.close();
    if (this.watchAttachmentsAbortController) {
      this.watchAttachmentsAbortController.abort();
    }
    if (this.statusListenerDispose) {
      this.statusListenerDispose();
      this.statusListenerDispose = undefined;
    }
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
    data: AttachmentData;
    fileExtension: string;
    mediaType?: string;
    metaData?: string;
    id?: string;
    updateHook?: (transaction: Transaction, attachment: AttachmentRecord) => Promise<void>;
  }): Promise<AttachmentRecord> {
    const resolvedId = id ?? (await this.generateAttachmentId());
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

    await this.attachmentService.withContext(async (ctx) => {
      await ctx.db.writeTransaction(async (tx) => {
        await updateHook?.(tx, attachment);
        await ctx.upsertAttachment(attachment, tx);
      });
    });

    return attachment;
  }

  async deleteFile({
    id,
    updateHook
  }: {
    id: string;
    updateHook?: (transaction: Transaction, attachment: AttachmentRecord) => Promise<void>;
  }): Promise<void> {
    await this.attachmentService.withContext(async (ctx) => {
      const attachment = await ctx.getAttachment(id);
      if (!attachment) {
        throw new Error(`Attachment with id ${id} not found`);
      }

      await ctx.db.writeTransaction(async (tx) => {
        await updateHook?.(tx, attachment);
        await ctx.upsertAttachment(
          {
            ...attachment,
            state: AttachmentState.QUEUED_DELETE,
            hasSynced: false
          },
          tx
        );
      });
    });
  }

  async expireCache(): Promise<void> {
    let isDone = false;
    while (!isDone) {
      await this.attachmentService.withContext(async (ctx) => {
        isDone = await this.syncingService.deleteArchivedAttachments(ctx);
      });
    }
  }

  async clearQueue(): Promise<void> {
    await this.attachmentService.withContext(async (ctx) => {
      await ctx.clearQueue();
    });
    await this.localStorage.clear();
  }

  /**
   * Verifies the integrity of all attachment records and repairs inconsistencies.
   *
   * This method checks each attachment record against the local filesystem and:
   * - Updates localUri if the file exists at a different path
   * - Archives attachments with missing local files that haven't been uploaded
   * - Requeues synced attachments for download if their local files are missing
   */
  async verifyAttachments(): Promise<void> {
    await this.attachmentService.withContext(async (ctx) => {
      const attachments = await ctx.getAttachments();
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
          // The file exists locally but the localUri is broken, we update it.
          updates.push({
            ...attachment,
            localUri: newLocalUri
          });
        } else {
          // the file doesn't exist locally.
          if (attachment.state === AttachmentState.SYNCED) {
            // the file has been successfully synced to remote storage but is missing
            // we download it again
            updates.push({
              ...attachment,
              state: AttachmentState.QUEUED_DOWNLOAD,
              localUri: undefined
            });
          } else {
            // the file wasn't successfully synced to remote storage, we archive it
            updates.push({
              ...attachment,
              state: AttachmentState.ARCHIVED,
              localUri: undefined // Clears the value
            });
          }
        }
      }

      await ctx.saveAttachments(updates);
    });
  }
}
