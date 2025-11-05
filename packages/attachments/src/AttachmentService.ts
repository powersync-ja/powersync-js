import { AbstractPowerSyncDatabase, DifferentialWatchedQuery } from '@powersync/common';
import { AttachmentRecord, AttachmentState } from './Schema.js';

/**
 * Service for querying and watching attachment records in the database.
 */
export class AttachmentService {
  constructor(
    private tableName: string = 'attachments',
    private db: AbstractPowerSyncDatabase
  ) {}

  /**
   * Creates a differential watch query for active attachments requiring synchronization.
   * @returns Watch query that emits changes for queued uploads, downloads, and deletes
   */
  watchActiveAttachments({ throttleMs }: { throttleMs?: number } = {}): DifferentialWatchedQuery<AttachmentRecord> {
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
