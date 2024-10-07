import { column, Schema, Table } from '@powersync/web';

export const local_bucket_data = new Table(
  {
    total_operations: column.integer,
    last_op: column.text,
    download_size: column.integer,
    downloading: column.integer
  },
  { localOnly: true }
);

export const local_schema = new Table(
  {
    data: column.text
  },
  { localOnly: true }
);

export const AppSchema = new Schema({
  local_bucket_data,
  local_schema
});

export type Database = (typeof AppSchema)['types'];
export type LocalBucketData = Database['local_bucket_data'];
