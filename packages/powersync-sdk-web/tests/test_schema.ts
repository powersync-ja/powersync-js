import { Column, ColumnType, Index, IndexedColumn, Schema, Table } from '../src';

export const testSchema = new Schema([
  new Table({
    name: 'assets',
    columns: [
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'make', type: ColumnType.TEXT }),
      new Column({ name: 'model', type: ColumnType.TEXT }),
      new Column({ name: 'serial_number', type: ColumnType.TEXT }),
      new Column({ name: 'quantity', type: ColumnType.INTEGER }),
      new Column({ name: 'user_id', type: ColumnType.TEXT }),
      new Column({ name: 'customer_id', type: ColumnType.TEXT }),
      new Column({ name: 'description', type: ColumnType.TEXT })
    ],
    indexes: [
      new Index({
        name: 'makemodel',
        columns: [new IndexedColumn({ name: 'make' }), new IndexedColumn({ name: 'model' })]
      })
    ]
  }),

  new Table({
    name: 'customers',
    columns: [new Column({ name: 'name', type: ColumnType.TEXT }), new Column({ name: 'email', type: ColumnType.TEXT })]
  })
]);
