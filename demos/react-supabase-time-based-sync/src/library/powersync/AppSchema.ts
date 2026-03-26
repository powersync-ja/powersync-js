import { column, Schema, Table } from '@powersync/web';

export const ISSUES_TABLE = 'issues';

const issues = new Table(
  {
    title: column.text,
    description: column.text,
    status: column.text,
    priority: column.text,
    created_by: column.text,
    // Postgres TIMESTAMPTZ — replicated to SQLite as text by PowerSync
    created_at: column.text,
    updated_at: column.text
  },
  { indexes: { updated: ['updated_at'] } }
);

export const AppSchema = new Schema({
  issues
});

export type Database = (typeof AppSchema)['types'];
export type IssueRecord = Database['issues'];
