import { Column, ColumnType, Index, IndexedColumn, Schema, Table } from '@journeyapps/powersync-sdk-web';

export const AppSchema = new Schema([
  new Table({
    name: 'documents',
    columns: [
      new Column({ name: 'title', type: ColumnType.TEXT }),
      new Column({ name: 'created_at', type: ColumnType.TEXT })
    ]
  }),
  new Table({
    name: 'document_updates',
    columns: [
      new Column({ name: 'created_at', type: ColumnType.TEXT }),
      new Column({ name: 'document_id', type: ColumnType.TEXT }),
      new Column({ name: 'update_b64', type: ColumnType.TEXT })
    ],
    indexes: [new Index({ name: 'by_document', columns: [new IndexedColumn({ name: 'document_id' })] })]
  })
]);
