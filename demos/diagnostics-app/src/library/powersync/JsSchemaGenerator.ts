import { Column, Schema } from '@powersync/web';

export class JsSchemaGenerator {
  generate(schema: Schema): string {
    const tables = schema.tables;

    return `new Schema([
  ${tables.map((table) => this.generateTable(table.name, table.columns)).join(',\n  ')}
])
`;
  }

  private generateTable(name: string, columns: Column[]): string {
    return `new Table({
    name: '${name}',
    columns: [
      ${columns.map((c) => this.generateColumn(c)).join(',\n      ')}
    ]
  })`;
  }

  private generateColumn(column: Column) {
    const t = column.type;
    return `new Column({ name: '${column.name}', type: ColumnType.${column.type} })`;
  }
}
