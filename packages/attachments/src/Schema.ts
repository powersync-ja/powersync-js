import { Column, ColumnType, Table, TableOptions } from '@powersync/common';

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

export interface AttachmentTableOptions extends Omit<TableOptions, 'name' | 'columns'> {
  name?: string;
  additionalColumns?: Column[];
}

export class AttachmentTable extends Table {
  constructor(options?: AttachmentTableOptions) {
    super({
      ...options,
      name: options?.name ?? ATTACHMENT_TABLE,
      localOnly: true,
      insertOnly: false,
      columns: [
        new Column({ name: 'filename', type: ColumnType.TEXT }),
        new Column({ name: 'local_uri', type: ColumnType.TEXT }),
        new Column({ name: 'timestamp', type: ColumnType.INTEGER }),
        new Column({ name: 'size', type: ColumnType.INTEGER }),
        new Column({ name: 'media_type', type: ColumnType.TEXT }),
        new Column({ name: 'state', type: ColumnType.INTEGER }), // Corresponds to AttachmentState
        ...(options?.additionalColumns ?? [])
      ]
    });
  }
}
