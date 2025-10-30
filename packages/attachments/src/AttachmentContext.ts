import { AbstractPowerSyncDatabase, ILogger, Transaction } from '@powersync/common';
import { AttachmentRecord, AttachmentState, attachmentFromSql } from './Schema.js';

/**
 * AttachmentContext provides database operations for managing attachment records.
 * 
 * Provides methods to query, insert, update, and delete attachment records with
 * proper transaction management through PowerSync.
 */
export class AttachmentContext {
  /** PowerSync database instance for executing queries */
  db: AbstractPowerSyncDatabase;
  
  /** Name of the database table storing attachment records */
  tableName: string;
  
  /** Logger instance for diagnostic information */
  logger: ILogger;

  /**
   * Creates a new AttachmentContext instance.
   * 
   * @param db - PowerSync database instance
   * @param tableName - Name of the table storing attachment records. Default: 'attachments'
   * @param logger - Logger instance for diagnostic output
   */
  constructor(db: AbstractPowerSyncDatabase, tableName: string = 'attachments', logger: ILogger) {
    this.db = db;
    this.tableName = tableName;
    this.logger = logger;
  }

  /**
   * Retrieves all active attachments that require synchronization.
   * Active attachments include those queued for upload, download, or delete.
   * Results are ordered by timestamp in ascending order.
   * 
   * @returns Promise resolving to an array of active attachment records
   */
  async getActiveAttachments(): Promise<AttachmentRecord[]> {
    const attachments = await this.db.getAll(
      /* sql */
      `
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
      [AttachmentState.QUEUED_UPLOAD, AttachmentState.QUEUED_DOWNLOAD, AttachmentState.QUEUED_DELETE]
    );

    return attachments.map(attachmentFromSql);
  }

  /**
   * Retrieves all archived attachments.
   * 
   * Archived attachments are no longer referenced but haven't been permanently deleted.
   * These are candidates for cleanup operations to free up storage space.
   * 
   * @returns Promise resolving to an array of archived attachment records
   */
  async getArchivedAttachments(): Promise<AttachmentRecord[]> {
    const attachments = await this.db.getAll(
      /* sql */
      `
        SELECT
          *
        FROM
          ${this.tableName}
        WHERE
          state = ?
        ORDER BY
          timestamp ASC
      `,
      [AttachmentState.ARCHIVED]
    );

    return attachments.map(attachmentFromSql);
  }

  /**
   * Retrieves all attachment records regardless of state.
   * Results are ordered by timestamp in ascending order.
   * 
   * @returns Promise resolving to an array of all attachment records
   */
  async getAttachments(): Promise<AttachmentRecord[]> {
    const attachments = await this.db.getAll(
      /* sql */
      `
        SELECT
          *
        FROM
          ${this.tableName}
        ORDER BY
          timestamp ASC
      `,
      []
    );

    return attachments.map(attachmentFromSql);
  }

  /**
   * Inserts or updates an attachment record within an existing transaction.
   * 
   * Performs an upsert operation (INSERT OR REPLACE). Must be called within
   * an active database transaction context.
   * 
   * @param attachment - The attachment record to upsert
   * @param context - Active database transaction context
   */
  upsertAttachment(attachment: AttachmentRecord, context: Transaction): void {
    context.execute(
      /* sql */
      `
        INSERT
        OR REPLACE INTO ${this.tableName} (
          id,
          filename,
          local_uri,
          size,
          media_type,
          timestamp,
          state,
          has_synced,
          meta_data
        )
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        attachment.id,
        attachment.filename,
        attachment.localUri || null,
        attachment.size || null,
        attachment.mediaType || null,
        attachment.timestamp,
        attachment.state,
        attachment.hasSynced ? 1 : 0,
        attachment.metaData || null
      ]
    );
  }

  /**
   * Permanently deletes an attachment record from the database.
   * 
   * This operation removes the attachment record but does not delete
   * the associated local or remote files. File deletion should be handled
   * separately through the appropriate storage adapters.
   * 
   * @param attachmentId - Unique identifier of the attachment to delete
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    await this.db.writeTransaction((tx) =>
      tx.execute(
        /* sql */
        `
          DELETE FROM ${this.tableName}
          WHERE
            id = ?
        `,
        [attachmentId]
      )
    );
  }

  /**
   * Saves multiple attachment records in a single transaction.
   * 
   * All updates are saved in a single batch after processing.
   * If the attachments array is empty, no database operations are performed.
   * 
   * @param attachments - Array of attachment records to save
   */
  async saveAttachments(attachments: AttachmentRecord[]): Promise<void> {
    if (attachments.length === 0) {
      return;
    }
    await this.db.writeTransaction(async (tx) => {
      for (const attachment of attachments) {
        this.upsertAttachment(attachment, tx);
      }
    });
  }
}
