import { Column, ColumnType, Schema, Table } from '@powersync/web';

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

export const AppSchema = new Schema([
  new Table({
    name: TABLE_NAME,
    columns: [
      new Column({ name: 'shape', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'user_id', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'operations',
    columns: [
      new Column({ name: 'operation', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'user_id', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'settings',
    localOnly: true,
    columns: [new Column({ name: 'initialized', type: ColumnType.INTEGER })]
  })
]);

export function randomPebbleShape(): Shape {
  const colors = Object.values(Shape);
  return colors[Math.floor(Math.random() * colors.length)];
}
