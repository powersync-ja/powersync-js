import { column, Schema, Table } from '@powersync/web';

export const TABLE_NAME = 'pebbles';
export const MAX_PEBBLES = 5;
export const NUM_INIT_PEBBLES = 3;

export enum Shape {
  HEXAGON = 'hexagon',
  CIRCLE = 'circle',
  DIAMOND = 'diamond',
  TRIANGLE = 'triangle',
  PENTAGON = 'pentagon'
}

export interface PebbleDef {
  id: string;
  shape: Shape;
  created_at: string;
  user_id: string;
}

export const AppSchema = new Schema({
  [TABLE_NAME]: new Table({
    shape: column.text,
    created_at: column.text,
    user_id: column.text
  }),
  operations: new Table({
    operation: column.text,
    created_at: column.text,
    user_id: column.text
  }),
  settings: new Table(
    {
      initialized: column.integer
    },
    { localOnly: true }
  )
});

export function randomPebbleShape(): Shape {
  const colors = Object.values(Shape);
  return colors[Math.floor(Math.random() * colors.length)];
}
