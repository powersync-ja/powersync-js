import { column, Schema, Table } from '@powersync/web';

const documents = new Table({
  title: column.text,
  created_at: column.text
});

const document_updates = new Table(
  {
    document_id: column.text,
    created_at: column.text,
    update_b64: column.text,
    // Store an id of whom the update was created by.
    // This is only used to not reapply updates which were created by the local editor.
    editor_id: column.text
  },
  { indexes: { by_document: ['document_id'] } }
);

export const AppSchema = new Schema({
  documents,
  document_updates
});

export type Database = (typeof AppSchema)['types'];
export type Documents = Database['documents'];

export type DocumentUpdates = Database['document_updates'];
