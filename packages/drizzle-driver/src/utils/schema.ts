import { column, Table, type BaseColumnType, type TableV2Options } from '@powersync/common';
import {
  SQLiteInteger,
  SQLiteReal,
  SQLiteText,
  type SQLiteTableWithColumns,
  type TableConfig
} from 'drizzle-orm/sqlite-core';

export function toPowerSyncTable<T extends TableConfig>(table: SQLiteTableWithColumns<T>, options?: TableV2Options) {
  const columns: { [key: string]: BaseColumnType<number | string | null> } = {};
  for (const [columnName, columnValue] of Object.entries(table)) {
    // Skip the id column
    if (columnName === 'id') {
      continue;
    }

    let mappedType: BaseColumnType<number | string | null>;
    switch (columnValue.columnType) {
      case SQLiteText.name:
        mappedType = column.text;
        break;
      case SQLiteInteger.name:
        mappedType = column.integer;
        break;
      case SQLiteReal.name:
        mappedType = column.real;
        break;
      default:
        throw new Error(`Unsupported column type: ${columnValue.columnType}`);
    }
    columns[columnName] = mappedType;
  }
  return new Table(columns, options);
}
