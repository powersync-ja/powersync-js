import {
  column,
  IndexShorthand,
  Schema,
  SchemaTableType,
  Table,
  type BaseColumnType,
  type TableV2Options
} from '@powersync/common';
import { InferSelectModel, isTable, Relations } from 'drizzle-orm';
import {
  getTableConfig,
  SQLiteInteger,
  SQLiteReal,
  SQLiteText,
  type SQLiteTableWithColumns,
  type TableConfig
} from 'drizzle-orm/sqlite-core';

export type ExtractPowerSyncColumns<T extends SQLiteTableWithColumns<any>> = {
  [K in keyof InferSelectModel<T> as K extends 'id' ? never : K]: BaseColumnType<InferSelectModel<T>[K]>;
};

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export function toPowerSyncTable<T extends SQLiteTableWithColumns<any>>(
  table: T,
  options?: Omit<TableV2Options, 'indexes'>
): Table<Expand<ExtractPowerSyncColumns<T>>> {
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
  return new Table(columns, { ...options, indexes }) as Table<Expand<ExtractPowerSyncColumns<T>>>;
}

export type DrizzleTablePowerSyncOptions = Omit<TableV2Options, 'indexes'>;

export type DrizzleTableWithPowerSyncOptions = {
  tableDefinition: SQLiteTableWithColumns<any>;
  options?: DrizzleTablePowerSyncOptions | undefined;
};

export type TableName<T> =
  T extends SQLiteTableWithColumns<any>
    ? T['_']['name']
    : T extends DrizzleTableWithPowerSyncOptions
      ? T['tableDefinition']['_']['name']
      : never;

export type TablesFromSchemaEntries<T> = {
  [K in keyof T as T[K] extends Relations
    ? never
    : T[K] extends SQLiteTableWithColumns<any> | DrizzleTableWithPowerSyncOptions
      ? TableName<T[K]>
      : never]: T[K] extends SQLiteTableWithColumns<any>
    ? Table<Expand<ExtractPowerSyncColumns<T[K]>>>
    : T[K] extends DrizzleTableWithPowerSyncOptions
      ? Table<Expand<ExtractPowerSyncColumns<T[K]['tableDefinition']>>>
      : never;
};

export function toPowerSyncSchema<
  T extends Record<string, SQLiteTableWithColumns<any> | Relations | DrizzleTableWithPowerSyncOptions>
>(schemaEntries: T): Schema<Expand<TablesFromSchemaEntries<T>>> {
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

  return new Schema(tables) as Schema<Expand<TablesFromSchemaEntries<T>>>;
}

export function toPowerSyncTables<
  T extends Record<string, SQLiteTableWithColumns<any> | Relations | DrizzleTableWithPowerSyncOptions>
>(schemaEntries: T) {
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

  return tables;
}

export class DrizzleAppSchema<
  T extends Record<string, SQLiteTableWithColumns<any> | Relations | DrizzleTableWithPowerSyncOptions>
> extends Schema {
  constructor(drizzleSchema: T) {
    super(toPowerSyncTables(drizzleSchema));
    // This is just used for typing
    this.types = {} as SchemaTableType<Expand<TablesFromSchemaEntries<T>>>;
  }

  readonly types: SchemaTableType<Expand<TablesFromSchemaEntries<T>>>;
}
