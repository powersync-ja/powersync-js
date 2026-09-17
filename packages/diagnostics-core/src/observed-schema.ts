import { isRecord } from './json.js';

const OBSERVED_VALUE_TYPES = ['Null', 'String', 'Integer', 'Real'] as const;

export type ObservedValueType = (typeof OBSERVED_VALUE_TYPES)[number];

/** One `SchemaChange` diagnostics event from the core: a column it saw while applying downloads. */
export interface ObservedColumn {
  table: string;
  column: string;
  value_type: ObservedValueType;
}

/** Whether a core `SchemaChange` payload is a column observation this schema can record. */
export function isObservedColumn(value: unknown): value is ObservedColumn {
  return (
    isRecord(value) &&
    typeof value.table === 'string' &&
    typeof value.column === 'string' &&
    typeof value.value_type === 'string' &&
    (OBSERVED_VALUE_TYPES as readonly string[]).includes(value.value_type)
  );
}

/** The SQLite storage class a column is declared with. */
export type ObservedColumnType = 'TEXT' | 'INTEGER' | 'REAL';

export interface ObservedColumnDefinition {
  name: string;
  type: ObservedColumnType;
}

export interface ObservedTableDefinition {
  name: string;
  /** Every observed column but `id`, which is implicit on every PowerSync table. */
  columns: ObservedColumnDefinition[];
}

/** The schema inferred so far, as plain data. An SDK host turns it into its own schema type. */
export interface ObservedSchemaDefinition {
  tables: ObservedTableDefinition[];
}

const mergeValueType = (current: ObservedValueType | undefined, incoming: ObservedValueType): ObservedValueType => {
  if (incoming === 'Null') {
    return current ?? 'Null';
  }
  if (current === undefined || current === 'Null' || current === incoming) {
    return incoming;
  }
  const isNumericPair =
    (current === 'Integer' && incoming === 'Real') || (current === 'Real' && incoming === 'Integer');
  return isNumericPair ? 'Real' : 'String';
};

const toValueType = (value: unknown): ObservedValueType => {
  if (value === null || value === undefined) {
    return 'Null';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'Integer' : 'Real';
  }
  // SQLite has no boolean, and anything structured is stored as JSON text.
  return typeof value === 'boolean' ? 'Integer' : 'String';
};

const toColumnType = (valueType: ObservedValueType): ObservedColumnType => {
  switch (valueType) {
    case 'Integer':
      return 'INTEGER';
    case 'Real':
      return 'REAL';
    default:
      return 'TEXT';
  }
};

/**
 * Builds a client schema from the columns the core reports while downloading, so data that arrives
 * for tables this client never declared becomes queryable instead of staying in `ps_untyped`.
 *
 * The result is plain data ({@link ObservedSchemaDefinition}); the host that owns the database
 * converts it to the SDK's schema type and applies it.
 */
export class ObservedSchema {
  private tables = new Map<string, Map<string, ObservedValueType>>();

  /** Records one observation and returns whether it changed the schema. */
  observe(observed: ObservedColumn): boolean {
    // `id` is implicit on every PowerSync table.
    if (observed.column === 'id') {
      return this.ensureTable(observed.table).isNewTable;
    }

    const { columns, isNewTable } = this.ensureTable(observed.table);
    const current = columns.get(observed.column);
    const next = mergeValueType(current, observed.value_type);
    columns.set(observed.column, next);
    return isNewTable || current !== next;
  }

  /**
   * Records every column of a row the database already holds.
   *
   * The core reports columns as it applies downloads, so rows that were downloaded by an earlier
   * session are never announced again. Reading them back is what keeps them queryable.
   */
  observeStoredRow(table: string, json: string): boolean {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return false;
    }
    if (!isRecord(parsed)) {
      return false;
    }
    let hasChanged = this.ensureTable(table).isNewTable;
    for (const [name, value] of Object.entries(parsed)) {
      hasChanged = this.observe({ table, column: name, value_type: toValueType(value) }) || hasChanged;
    }
    return hasChanged;
  }

  get tableNames(): string[] {
    return Array.from(this.tables.keys());
  }

  toSchema(): ObservedSchemaDefinition {
    const tables: ObservedTableDefinition[] = [];
    for (const [name, columns] of this.tables) {
      tables.push({
        name,
        columns: Array.from(columns, ([columnName, valueType]) => ({ name: columnName, type: toColumnType(valueType) }))
      });
    }
    return { tables };
  }

  /** The table's columns, created on first sight, and whether this was that first sight. */
  private ensureTable(name: string): { columns: Map<string, ObservedValueType>; isNewTable: boolean } {
    const existing = this.tables.get(name);
    if (existing !== undefined) {
      return { columns: existing, isNewTable: false };
    }
    const columns = new Map<string, ObservedValueType>();
    this.tables.set(name, columns);
    return { columns, isNewTable: true };
  }
}
