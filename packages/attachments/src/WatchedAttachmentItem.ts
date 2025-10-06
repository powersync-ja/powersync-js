// A watched attachment record item.
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
