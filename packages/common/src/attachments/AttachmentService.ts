import { Mutex } from 'async-mutex';
import { AbstractPowerSyncDatabase } from '../client/AbstractPowerSyncDatabase.js';
import { DifferentialWatchedQuery } from '../client/watched/processors/DifferentialQueryProcessor.js';
import { ILogger } from '../utils/Logger.js';
import { mutexRunExclusive } from '../utils/mutex.js';
import { AttachmentContext } from './AttachmentContext.js';
import { AttachmentRecord, AttachmentState } from './Schema.js';

/**
 * Service for querying and watching attachment records in the database.
 */
export class AttachmentService {
  private mutex = new Mutex();
  private context: AttachmentContext;

  constructor(
    private db: AbstractPowerSyncDatabase,
    private logger: ILogger,
    private tableName: string = 'attachments',
    archivedCacheLimit: number = 100
  ) {
    this.context = new AttachmentContext(db, tableName, logger, archivedCacheLimit);
  }

  /**
   * Creates a differential watch query for active attachments requiring synchronization.
   * @returns Watch query that emits changes for queued uploads, downloads, and deletes
   */
  watchActiveAttachments({ throttleMs }: { throttleMs?: number } = {}): DifferentialWatchedQuery<AttachmentRecord> {
    this.logger.info('Watching active attachments...');
    const watch = this.db
      .query<AttachmentRecord>({
        sql: /* sql */ `
          SELECT
            *
          FROM
            ${this.tableName}
          WHERE
            state = ?
            OR state = ?
            OR state = ?
          ORDER BY
            timestamp ASC
        `,
        parameters: [AttachmentState.QUEUED_UPLOAD, AttachmentState.QUEUED_DOWNLOAD, AttachmentState.QUEUED_DELETE]
      })
      .differentialWatch({ throttleMs });

    return watch;
  }

  /**
   * Executes a callback with exclusive access to the attachment context.
   */
  async withContext<T>(callback: (context: AttachmentContext) => Promise<T>): Promise<T> {
    return mutexRunExclusive(this.mutex, async () => {
      return callback(this.context);
    });
  }
}
