import { column, Schema, Table } from '@powersync/web';

export const PEBBLES_TABLE = 'pebbles';
export const MAX_PEBBLES = 5;
export const NUM_INIT_PEBBLES = 3;

export enum Shape {
  HEXAGON = 'hexagon',
  CIRCLE = 'circle',
  DIAMOND = 'diamond',
  TRIANGLE = 'triangle',
  PENTAGON = 'pentagon'
}

const pebbles = new Table({
  shape: column.text,
  created_at: column.text,
  user_id: column.text
});

const operations = new Table({
  operation: column.text,
  created_at: column.text,
  user_id: column.text
});

const settings = new Table(
  {
    initialized: column.integer
  },
  { localOnly: true }
);

export const AppSchema = new Schema({
  [PEBBLES_TABLE]: pebbles,
  operations,
  settings
});

export type Database = (typeof AppSchema)['types'];
export type PebbleRecord = Database[typeof PEBBLES_TABLE] & { shape: Shape };

export function randomPebbleShape(): Shape {
  const shapes = Object.values(Shape);
  return shapes[Math.floor(Math.random() * shapes.length)];
}
