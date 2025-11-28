import { AbstractPowerSyncDatabase } from '../client/AbstractPowerSyncDatabase.js';
import { DifferentialWatchedQuery } from '../client/watched/processors/DifferentialQueryProcessor.js';
import { ILogger } from '../utils/Logger.js';
import { AttachmentRecord, AttachmentState } from './Schema.js';

/**
 * Service for querying and watching attachment records in the database.
 */
export class AttachmentService {
  constructor(
    private db: AbstractPowerSyncDatabase,
    private logger: ILogger,
    private tableName: string = 'attachments',
  ) {}

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
}
