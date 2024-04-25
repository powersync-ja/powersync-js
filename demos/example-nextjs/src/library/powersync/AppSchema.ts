import { column, Schema, TableV2 } from '@powersync/web';

const customers = new TableV2({
  name: column.text,
  created_at: column.text
});

export const AppSchema = new Schema({
  customers
});

export type Database = (typeof AppSchema)['types'];
export type Customer = Database['customers'];
