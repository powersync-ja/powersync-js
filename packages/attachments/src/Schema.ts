import { Column, ColumnsType, ColumnType, Table, TableOptions, column, TableV2Options } from '@powersync/common';

export const ATTACHMENT_TABLE = 'attachments';

export interface AttachmentRecord {
  id: string;
  filename: string;
  local_uri?: string;
  size?: number;
  media_type?: string;
  timestamp?: number;
  state: AttachmentState;
}

export enum AttachmentState {
  QUEUED_SYNC = 0, // Check if the attachment needs to be uploaded or downloaded
  QUEUED_UPLOAD = 1, // Attachment to be uploaded
  QUEUED_DOWNLOAD = 2, // Attachment to be downloaded
  SYNCED = 3, // Attachment has been synced
  ARCHIVED = 4 // Attachment has been orphaned, i.e. the associated record has been deleted
}

export interface AttachmentTableOptions extends Omit<TableV2Options, 'name' | 'columns'> {
  name?: string;
  additionalColumns?: ColumnsType;
}

export class AttachmentTable extends Table {
  constructor(options?: AttachmentTableOptions) {
    super(
      {
        filename: column.text,
        local_uri: column.text,
        timestamp: column.integer,
        size: column.integer,
        media_type: column.text,
        state: column.integer,
        ...options?.additionalColumns
      },
      {
        name: ATTACHMENT_TABLE,
        ...options,
        localOnly: true,
        insertOnly: false
      }
    );
  }
}
