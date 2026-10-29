import { column, Schema, Table } from '@powersync/web';

const chats = new Table({
  title: column.text,
  // Postgres TIMESTAMPTZ — replicated to SQLite as ISO-8601 text by PowerSync
  created_at: column.text,
  updated_at: column.text
});

const messages = new Table(
  {
    chat_id: column.text,
    role: column.text,
    content: column.text,
    status: column.text,
    write_count: column.integer,
    claim_id: column.text,
    created_at: column.text
  },
  { indexes: { chat: ['chat_id', 'created_at'] } }
);

export const AppSchema = new Schema({
  chats,
  messages
});

export type Database = (typeof AppSchema)['types'];
export type ChatRecord = Database['chats'];
export type MessageRecord = Database['messages'];

/** Assistant replies move from 'pending' to 'streaming', then end as 'done', 'stopped' or 'error'. */
export type MessageStatus = 'pending' | 'streaming' | 'done' | 'stopped' | 'error';
