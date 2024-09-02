import { column, ColumnsType, TableV2 } from '@powersync/common';

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

export interface AttachmentTableOptions {
  name?: string;
  additionalColumns?: ColumnsType;
}

export class AttachmentTable extends TableV2 {
  constructor(options?: AttachmentTableOptions) {
    super(
        {
          filename: column.text,
          local_uri: column.text,
          timestamp: column.integer,
          size: column.integer,
          media_type: column.text,
          // Corresponds to AttachmentState
          state: column.integer,
          ...options?.additionalColumns
        },
        {
          localOnly: true,
          insertOnly: false,
          viewName: options?.name ?? ATTACHMENT_TABLE
        }
    );
  }
}
