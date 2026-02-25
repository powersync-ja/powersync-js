import { column, Schema, Table } from '@powersync/web';

export const LOCAL_BUCKET_DATA_TABLE_NAME = 'local_bucket_data';
export const LOCAL_SCHEMA_TABLE_NAME = 'local_schema';

export const local_bucket_data = new Table(
  {
    total_operations: column.integer,
    last_op: column.text,
    download_size: column.integer,
    downloaded_operations: column.integer,
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

export const DiagnosticsAppSchema = new Schema({
  local_bucket_data,
  local_schema
});

export type Database = (typeof DiagnosticsAppSchema)['types'];
export type LocalBucketData = Database['local_bucket_data'];
