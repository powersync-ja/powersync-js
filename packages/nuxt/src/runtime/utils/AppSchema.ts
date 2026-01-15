import { column, Schema, Table } from '@powersync/web'

export const LOCAL_BUCKET_DATA = new Table(
  {
    total_operations: column.integer,
    last_op: column.text,
    download_size: column.integer,
    downloaded_operations: column.integer,
    downloading: column.integer,
  },
  { localOnly: true },
)

export const LOCAL_SCHEMA = new Table(
  {
    data: column.text,
  },
  { localOnly: true },
)

export const DiagnosticsAppSchema = new Schema({
  LOCAL_BUCKET_DATA,
  LOCAL_SCHEMA,
})

export type Database = (typeof DiagnosticsAppSchema)['types']
export type LocalBucketData = Database['LOCAL_BUCKET_DATA']
