import { Schema, Table, column } from '@powersync/web';

const assets = new Table(
  {
    created_at: column.text,
    make: column.text,
    model: column.text,
    serial_number: column.text,
    quantity: column.integer,
    user_id: column.text,
    customer_id: column.text,
    description: column.text
  },
  { indexes: { makemodel: ['make, model'] } }
);

const customers = new Table({
  name: column.text,
  email: column.text
});

export const TEST_SCHEMA = new Schema({ assets, customers });

export type TestDatabase = (typeof TEST_SCHEMA)['types'];

export type Customer = TestDatabase['customers'];
export type Asset = TestDatabase['assets'];
