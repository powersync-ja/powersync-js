import { Column, ColumnsType, Schema, Table } from '@powersync/web';

export class JsSchemaGenerator {
  generate(schema: Schema): string {
    const tables = schema.tables;

    return this.generateTables(tables) + '\n\n' + this.generateAppSchema(tables);
  }

  private generateTables(tables: Table<ColumnsType>[]): string {
    return tables.map((table) => this.generateTable(table.name, table.columns)).join('\n\n');
  }

  private generateTable(name: string, columns: Column[]): string {
    return `export const ${name} = new Table(
  {
    // id column (text) is automatically included
    ${columns.map((column) => this.generateColumn(column)).join(',\n    ')}
  },
  { indexes: {} }
);`;
  }

  private generateColumn(column: Column) {
    const t = column.type;
    return `${column.name}: column.${column.type!.toLowerCase()}`;
  }

  private generateAppSchema(tables: Table<ColumnsType>[]): string {
    return `export const AppSchema = new Schema({
  ${tables.map((table) => table.name).join(',\n  ')}
});

export type Database = (typeof AppSchema)['types'];`;
  }
}
