import { column } from '../db/schema/Column.js';
import { Table } from '../db/schema/Table.js';
import { TableV2Options } from '../db/schema/Table.js';

export const ATTACHMENT_TABLE = 'attachments';

/**
 * AttachmentRecord represents an attachment in the local database.
 */
export interface AttachmentRecord {
  id: string;
  filename: string;
  localUri?: string | null;
  size?: number;
  mediaType?: string;
  timestamp?: number;
  metaData?: string;
  hasSynced?: boolean;
  state: AttachmentState;
}

/**
 * Maps a database row to an AttachmentRecord.
 */
export function attachmentFromSql(row: any): AttachmentRecord {
  return {
    id: row.id,
    filename: row.filename,
    localUri: row.local_uri,
    size: row.size,
    mediaType: row.media_type,
    timestamp: row.timestamp,
    metaData: row.meta_data,
    hasSynced: row.has_synced === 1,
    state: row.state
  };
}

/**
 * AttachmentState represents the current synchronization state of an attachment.
 */
export enum AttachmentState {
  QUEUED_UPLOAD = 0, // Attachment to be uploaded
  QUEUED_DOWNLOAD = 1, // Attachment to be downloaded
  QUEUED_DELETE = 2, // Attachment to be deleted
  SYNCED = 3, // Attachment has been synced
  ARCHIVED = 4 // Attachment has been orphaned, i.e. the associated record has been deleted
}

export interface AttachmentTableOptions extends Omit<TableV2Options, 'name' | 'columns'> {}

/**
 * AttachmentTable defines the schema for the attachment queue table.
 */
export class AttachmentTable extends Table {
  constructor(options?: AttachmentTableOptions) {
    super(
      {
        filename: column.text,
        local_uri: column.text,
        timestamp: column.integer,
        size: column.integer,
        media_type: column.text,
        state: column.integer, // Corresponds to AttachmentState
        has_synced: column.integer,
        meta_data: column.text
      },
      {
        ...options,
        viewName: options?.viewName ?? ATTACHMENT_TABLE,
        localOnly: true,
        insertOnly: false
      }
    );
  }
}
