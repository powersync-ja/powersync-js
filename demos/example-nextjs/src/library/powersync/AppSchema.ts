import { column, Schema, TableV2 } from '@powersync/web';

const customers = new TableV2({
  name: column.text,
  created_at: column.text
});

export const AppSchema = new Schema({
  customers,
  // TODO revert this before merge
  lists: new TableV2({
    name: column.text
  })
});

export type Database = (typeof AppSchema)['types'];
export type Customer = Database['customers'];
