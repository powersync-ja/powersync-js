import { AbstractPowerSyncDatabase, ILogger, Transaction } from '@powersync/common';
import { AttachmentRecord, AttachmentState, attachmentFromSql } from './Schema.js';

export class AttachmentContext {
  db: AbstractPowerSyncDatabase;
  tableName: string;
  logger: ILogger;

  constructor(db: AbstractPowerSyncDatabase, tableName: string = 'attachments', logger: ILogger) {
    this.db = db;
    this.tableName = tableName;
    this.logger = logger;
  }

  async getActiveAttachments(): Promise<any[]> {
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
