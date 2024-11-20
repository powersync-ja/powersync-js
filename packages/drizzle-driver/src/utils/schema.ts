import { column, IndexShorthand, Schema, Table, type BaseColumnType, type TableV2Options } from '@powersync/common';
import { isTable, Relations } from 'drizzle-orm';
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

export type DrizzleTablePowerSyncOptions = Omit<TableV2Options, 'indexes'>;

export type DrizzleTableWithPowerSyncOptions = {
  tableDefinition: SQLiteTableWithColumns<any>;
  options?: DrizzleTablePowerSyncOptions | undefined;
};

export function toPowerSyncSchema(
  schemaEntries: Record<string, SQLiteTableWithColumns<any> | Relations | DrizzleTableWithPowerSyncOptions>
) {
  const tables: Record<string, Table> = {};
  for (const schemaEntry of Object.values(schemaEntries)) {
    let maybeTable: SQLiteTableWithColumns<any> | Relations | undefined = undefined;
    let maybeOptions: DrizzleTablePowerSyncOptions | undefined = undefined;

    if (typeof schemaEntry === 'object' && 'tableDefinition' in schemaEntry) {
      const tableWithOptions = schemaEntry as DrizzleTableWithPowerSyncOptions;
      maybeTable = tableWithOptions.tableDefinition;
      maybeOptions = tableWithOptions.options;
    } else {
      maybeTable = schemaEntry;
    }

    if (isTable(maybeTable)) {
      const { name } = getTableConfig(maybeTable);
      tables[name] = toPowerSyncTable(maybeTable as SQLiteTableWithColumns<TableConfig>, maybeOptions);
    }
  }

  return new Schema(tables);
}
