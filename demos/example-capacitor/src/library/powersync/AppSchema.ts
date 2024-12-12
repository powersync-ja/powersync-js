import { column, Schema, Table } from '@powersync/web';

const customers = new Table({
  name: column.text,
  created_at: column.text
});

export const AppSchema = new Schema({
  customers
});

export type Database = (typeof AppSchema)['types'];
export type Customer = Database['customers'];
