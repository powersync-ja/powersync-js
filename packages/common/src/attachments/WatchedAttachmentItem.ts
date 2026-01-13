/**
 * WatchedAttachmentItem represents an attachment reference in your application's data model.
 * Use either filename OR fileExtension (not both).
 * 
 * @experimental
 */
export type WatchedAttachmentItem =
  | {
      id: string;
      filename: string;
      fileExtension?: never;
      metaData?: string;
    }
  | {
      id: string;
      fileExtension: string;
      filename?: never;
      metaData?: string;
    };
