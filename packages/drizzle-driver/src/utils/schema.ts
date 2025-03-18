import {
  column,
  IndexShorthand,
  Schema,
  SchemaTableType,
  Table,
  type BaseColumnType,
  type TableV2Options
} from '@powersync/common';
import { entityKind, InferSelectModel, isTable, Relations, type Casing } from 'drizzle-orm';
import { CasingCache } from 'drizzle-orm/casing';
import {
  getTableConfig,
  SQLiteBoolean,
  SQLiteCustomColumn,
  SQLiteInteger,
  SQLiteReal,
  SQLiteText,
  SQLiteTextJson,
  SQLiteTimestamp,
  type SQLiteColumn,
  type SQLiteTableWithColumns,
  type TableConfig
} from 'drizzle-orm/sqlite-core';

export type ExtractPowerSyncColumns<T extends SQLiteTableWithColumns<any>> = {
  [K in keyof InferSelectModel<T> as K extends 'id' ? never : K]: BaseColumnType<InferSelectModel<T>[K]>;
};

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export function toPowerSyncTable<T extends SQLiteTableWithColumns<any>>(
  table: T,
  options?: Omit<TableV2Options, 'indexes'> & { casingCache?: CasingCache }
): Table<Expand<ExtractPowerSyncColumns<T>>> {
  const { columns: drizzleColumns, indexes: drizzleIndexes } = getTableConfig(table);
  const { casingCache } = options ?? {};

  const columns: { [key: string]: BaseColumnType<number | string | null> } = {};
  for (const drizzleColumn of drizzleColumns) {
    const name = casingCache?.getColumnCasing(drizzleColumn) ?? drizzleColumn.name;

    // Skip the id column
    if (name === 'id') {
      continue;
    }

    columns[name] = mapDrizzleColumnToType(drizzleColumn);
  }
  const indexes: IndexShorthand = {};

  for (const index of drizzleIndexes) {
    index.config;
    if (!index.config.columns.length) {
      continue;
    }
    const columns: string[] = [];
    for (const indexColumn of index.config.columns) {
      const name = casingCache?.getColumnCasing(indexColumn as SQLiteColumn) ?? (indexColumn as { name: string }).name;

      columns.push(name);
    }

    indexes[index.config.name] = columns;
  }
  return new Table(columns, { ...options, indexes }) as Table<Expand<ExtractPowerSyncColumns<T>>>;
}

function mapDrizzleColumnToType(drizzleColumn: SQLiteColumn<any, object>): BaseColumnType<number | string | null> {
  switch (drizzleColumn.columnType) {
    case SQLiteText[entityKind]:
    case SQLiteTextJson[entityKind]:
      return column.text;
    case SQLiteInteger[entityKind]:
    case SQLiteTimestamp[entityKind]:
    case SQLiteBoolean[entityKind]:
      return column.integer;
    case SQLiteReal[entityKind]:
      return column.real;
    case SQLiteCustomColumn[entityKind]:
      const sqlName = (drizzleColumn as SQLiteCustomColumn<any>).getSQLType();
      switch (sqlName) {
        case 'text':
          return column.text;
        case 'integer':
          return column.integer;
        case 'real':
          return column.real;
        default:
          throw new Error(`Unsupported custom column type: ${drizzleColumn.columnType}: ${sqlName}`);
      }
    default:
      throw new Error(`Unsupported column type: ${drizzleColumn.columnType}`);
  }
}

export type DrizzleTablePowerSyncOptions = Omit<TableV2Options, 'indexes'>;

export type DrizzleTableWithPowerSyncOptions = {
  tableDefinition: SQLiteTableWithColumns<any>;
  options?: DrizzleTablePowerSyncOptions;
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

function toPowerSyncTables<
  T extends Record<string, SQLiteTableWithColumns<any> | Relations | DrizzleTableWithPowerSyncOptions>
>(schemaEntries: T, options?: DrizzleAppSchemaOptions) {
  const casingCache = options?.casing ? new CasingCache(options?.casing) : undefined;

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
      tables[name] = toPowerSyncTable(maybeTable as SQLiteTableWithColumns<TableConfig>, {
        ...maybeOptions,
        casingCache
      });
    }
  }

  return tables;
}

export type DrizzleAppSchemaOptions = {
  casing?: Casing;
};
export class DrizzleAppSchema<
  T extends Record<string, SQLiteTableWithColumns<any> | Relations | DrizzleTableWithPowerSyncOptions>
> extends Schema {
  constructor(drizzleSchema: T, options?: DrizzleAppSchemaOptions) {
    super(toPowerSyncTables(drizzleSchema, options));
    // This is just used for typing
    this.types = {} as SchemaTableType<Expand<TablesFromSchemaEntries<T>>>;
  }

  readonly types: SchemaTableType<Expand<TablesFromSchemaEntries<T>>>;
}
