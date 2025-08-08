import { column, Schema, Table } from '@powersync/web';

const customers = new Table({
  name: column.text,
  created_at: column.text
});

const products = new Table(
  {
    name: column.text
  },
  {
    localOnly: true
  }
);

export const AppSchema = new Schema({
  customers,
  products
});

export type Database = (typeof AppSchema)['types'];
export type Customer = Database['customers'];
