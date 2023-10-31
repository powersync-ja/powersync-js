import { Column, ColumnType, Table } from "@journeyapps/powersync-sdk-common";

export const ATTACHMENT_TABLE = "attachments";

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
  ARCHIVED = 4, // Attachment has been orphaned, i.e. the associated record has been deleted
}

export function createAttachmentTable(name: string = ATTACHMENT_TABLE) {
  return Table.createLocalOnly({
    name: name,
    columns: [
      new Column({ name: "filename", type: ColumnType.TEXT }),
      new Column({ name: "local_uri", type: ColumnType.TEXT }),
      new Column({ name: "timestamp", type: ColumnType.INTEGER }),
      new Column({ name: "size", type: ColumnType.INTEGER }),
      new Column({ name: "media_type", type: ColumnType.TEXT }),
      new Column({ name: "state", type: ColumnType.INTEGER }), // Corresponds to AttachmentState
    ],
  });
}
