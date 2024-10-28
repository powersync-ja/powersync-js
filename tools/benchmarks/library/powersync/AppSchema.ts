import { column, Column, ColumnType, Index, IndexedColumn, Schema, Table } from '@powersync/common';

export const TODO_TABLE = 'todos';
export const LIST_TABLE = 'lists';

export interface ListRecord {
  id: string;
  name: string;
  created_at: string;
  owner_id?: string;
}

export interface TodoRecord {
  id: string;
  created_at: string;
  completed: boolean;
  description: string;
  completed_at?: string;

  created_by: string;
  completed_by?: string;
  list_id: string;

  photo_id?: string; // This is the attachment id, 1:1 relationship with `id` in AttachmentTable
}

const bulk_data = new Table({
  created_at: column.text,
  name: column.text
});

const benchmark_items = new Table({
  description: column.text,
  client_created_at: column.text,
  client_received_at: column.text,
  server_created_at: column.text
});

export const AppSchema = new Schema({
  bulk_data,
  benchmark_items
});

export type BulkData = (typeof AppSchema)['types']['bulk_data'];
export type BenchmarkItem = (typeof AppSchema)['types']['benchmark_items'];

export function itemLatency(item: BenchmarkItem): number | null {
  if (item.client_received_at == null) {
    return null;
  }
  return Date.parse(item.client_received_at) - Date.parse(item.client_created_at!);
}

export function uploadLatency(item: BenchmarkItem): number | null {
  if (item.server_created_at == null) {
    return null;
  }
  return Date.parse(item.server_created_at) - Date.parse(item.client_created_at!);
}
