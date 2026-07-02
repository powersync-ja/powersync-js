import { CommonPowerSyncDatabase } from '../client/CommonPowerSyncDatabase.js';
import { DifferentialWatchedQuery } from '../client/watched/processors/DifferentialQueryProcessor.js';
import { PowerSyncLogger, LogLevels } from '../utils/Logger.js';
import { Mutex } from '../utils/mutex.js';
import { AttachmentContext } from './AttachmentContext.js';
import { AttachmentRecord, AttachmentState } from './Schema.js';

/**
 * Service for querying and watching attachment records in the database.
 *
 * @internal
 */
export class AttachmentService {
  private mutex: Mutex;
  private context: AttachmentContext;

  constructor(
    private db: CommonPowerSyncDatabase,
    private logger: PowerSyncLogger,
    private tableName: string = 'attachments',
    archivedCacheLimit: number = 100
  ) {
    this.mutex = db.createMutex();
    this.context = new AttachmentContext(db, tableName, logger, archivedCacheLimit);
  }

  /**
   * Creates a differential watch query for active attachments requiring synchronization.
   * @returns Watch query that emits changes for queued uploads, downloads, and deletes
   */
  watchActiveAttachments({ throttleMs }: { throttleMs?: number } = {}): DifferentialWatchedQuery<AttachmentRecord> {
    this.logger.log({ level: LogLevels.info, message: 'Watching active attachments...' });
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
    return this.mutex.runExclusive(async () => {
      return callback(this.context);
    });
  }
}
