import { column, IndexShorthand, Table, type BaseColumnType, type TableV2Options } from '@powersync/common';
import {
  getTableConfig,
  SQLiteInteger,
  SQLiteReal,
  SQLiteText,
  type SQLiteTableWithColumns,
  type TableConfig
} from 'drizzle-orm/sqlite-core';

export function toPowerSyncTable<T extends TableConfig>(
  table: SQLiteTableWithColumns<T>,
  options?: Omit<TableV2Options, 'indexes'>
) {
  const { columns: drizzleColumns, indexes: drizzleIndexes } = getTableConfig(table);

  const columns: { [key: string]: BaseColumnType<number | string | null> } = {};
  for (const drizzleColumn of drizzleColumns) {
    // Skip the id column
    if (drizzleColumn.name === 'id') {
      continue;
    }

    let mappedType: BaseColumnType<number | string | null>;
    switch (drizzleColumn.columnType) {
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
        throw new Error(`Unsupported column type: ${drizzleColumn.columnType}`);
    }
    columns[drizzleColumn.name] = mappedType;
  }
  const indexes: IndexShorthand = {};

  for (const index of drizzleIndexes) {
    index.config;
    if (!index.config.columns.length) {
      continue;
    }
    const columns: string[] = [];
    for (const indexColumn of index.config.columns) {
      columns.push((indexColumn as { name: string }).name);
    }

    indexes[index.config.name] = columns;
  }
  return new Table(columns, { ...options, indexes });
}
