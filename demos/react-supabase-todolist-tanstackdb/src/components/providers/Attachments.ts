import { AppSchema } from '@/library/powersync/AppSchema';
import {
  AbstractPowerSyncDatabase,
  AttachmentData,
  AttachmentErrorHandler,
  AttachmentQueue,
  AttachmentRecord,
  AttachmentService,
  AttachmentState,
  ILogger,
  IndexDBFileSystemStorageAdapter,
  LocalStorageAdapter,
  RemoteStorageAdapter,
  WatchedAttachmentItem
} from '@powersync/web';
import { Collection, createTransaction } from '@tanstack/db';
import { PowerSyncTransactor } from '@tanstack/powersync-db-collection';

export const LocalAttachmentStoage = new IndexDBFileSystemStorageAdapter('my-app-files');

export const RemoteAttachmentStorage = {
  async uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord) {
    // no-op for poc
  },

  async downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer> {
    // no-op for poc
    return new ArrayBuffer();
  },

  async deleteFile(attachment: AttachmentRecord) {
    // no-op for poc
  }
};

/**
 * This extends the default AttachmentQueue constructor params
 * FIXME(powersync) we should export this type from the common SDK.
 */
type TanStackDBAttachmentQueueParams = {
  db: AbstractPowerSyncDatabase;
  /**
   * For TanStack, we want access to the synced TanStackDB collection.
   * In order to have the same relational data be set in a single transaction.
   * This also allows for joining both TanStackDB collections.
   */
  attachmentsCollection: Collection<AttachmentQueueRow>;
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
};

/**
 * The PowerSync table row type
 */
type AttachmentQueueRow = (typeof AppSchema)['types']['attachments'];

/**
 * A custom extension of the PowerSyncAttachmentQueue.
 * We could export something like this in the TanStackDB integration
 */
export class TanStackDBAttachmentQueue extends AttachmentQueue {
  readonly powersync: AbstractPowerSyncDatabase;
  readonly collection: Collection<AttachmentQueueRow>;

  constructor(params: TanStackDBAttachmentQueueParams) {
    super(params);
    this.powersync = params.db;
    this.collection = params.attachmentsCollection;
  }

  /**
   * HACK: The AttachmentQueue should make this protected instead,
   * in order for extensions to use it.
   */
  get _attachmentService(): AttachmentService {
    // This is not protected, it's private and should be protected
    return this['attachmentService'] as AttachmentService;
  }

  /**
   * Saves a new attachment given the input data.
   * Provides an updateHook which is called inside a TanStackDB transaction.
   * Relational associataions with the provded attachment ID should be made in this hook.
   */
  async saveFileTanStack({
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
    // Note that this is called inside a synchronous TanStackDB transaction
    // any mutations made to other collections, will be in the same transaction.
    updateHook?: (attachment: AttachmentQueueRow) => Promise<void>;
  }): Promise<AttachmentQueueRow> {
    const resolvedId = id ?? (await this.generateAttachmentId());
    const filename = `${resolvedId}.${fileExtension}`;
    const localUri = this.localStorage.getLocalUri(filename);
    const size = await this.localStorage.saveFile(localUri, data);

    const attachment: AttachmentQueueRow = {
      id: resolvedId,
      filename,
      media_type: mediaType ?? null,
      local_uri: localUri,
      state: AttachmentState.QUEUED_UPLOAD,
      has_synced: 0,
      size,
      timestamp: new Date().getTime(),
      meta_data: metaData ?? null
    };

    /**
     * The use the attachmentService lock to prevent potential attachment queue race conditions.
     * This specicifally prevents assuming a newly watched attachment record is one to download.
     *  */
    await this._attachmentService.withContext(async (ctx) => {
      // Create a TanStackDB transaction context, the mutation will happen later
      const tanStackDBTransaction = createTransaction({
        autoCommit: false,
        mutationFn: async ({ transaction }) => {
          // Now we should apply the actual operations.
          // We can save the attachment using dedicated APIs
          await new PowerSyncTransactor({
            database: ctx.db
          }).applyTransaction(transaction);

          // We don't need to explicitly use this here, the default transactor should
          // be able to handle this (but it could be more future proof if we did support it later)
          // await ctx.upsertAttachment(attachment, tx);
        }
      });

      /**
       * TODO, does the user want to have the attachment record peristed in this transaction or not?
       * The implementation can be done according to the users's needs, devs should
       * implement this saveFile override themselves, this is just an example.
       *
       * In this example, we write the attachment record first.
       */
      tanStackDBTransaction.mutate(() => {
        // save the attachment record
        this.collection.insert(attachment);
        // allow the user to associate values in this transaction
        updateHook?.(attachment);
      });

      // Actually perform the transaction
      await tanStackDBTransaction.commit();
    });

    return attachment;
  }
}
