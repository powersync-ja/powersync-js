import { column, Schema, TableV2 } from '@journeyapps/powersync-sdk-web';

const customers = new TableV2({
  name: column.text,
  created_at: column.text
});

export const AppSchema = new Schema({
  customers,
  lists: new TableV2({
    name: column.text
  })
});

export type Database = (typeof AppSchema)['types'];
export type Customer = Database['customers'];
