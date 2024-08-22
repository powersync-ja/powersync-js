import { ColumnType } from '../Column';
import { Index } from './Index';
import { IndexedColumn } from './IndexedColumn';
import { InvalidSQLCharacters } from './Table';

export type BaseColumnType<T extends number | string | null> = {
  type: ColumnType;
};

const text: BaseColumnType<string | null> = {
  type: ColumnType.TEXT
};

const integer: BaseColumnType<number | null> = {
  type: ColumnType.INTEGER
};

const real: BaseColumnType<number | null> = {
  type: ColumnType.REAL
};

// There is maximum of 127 arguments for any function in SQLite. Currently we use json_object which uses 1 arg per key (column name)
// and one per value, which limits it to 63 arguments.
const MAX_AMOUNT_OF_COLUMNS = 63;

export const column = {
  text,
  integer,
  real
};

export type ColumnsType = Record<string, BaseColumnType<any>>;

export type ExtractColumnValueType<T extends BaseColumnType<any>> = T extends BaseColumnType<infer R> ? R : unknown;

export type RowType<T extends TableV2<any>> = {
  [K in keyof T['columns']]: ExtractColumnValueType<T['columns'][K]>;
} & {
  id: string;
};

export type IndexShorthand = Record<string, string[]>;

export interface TableV2Options {
  indexes?: IndexShorthand;
  localOnly?: boolean;
  insertOnly?: boolean;
  viewName?: string;
}

/*
  Generate a new table from the columns and indexes
*/
export class TableV2<Columns extends ColumnsType = ColumnsType> {
  public indexes: Index[];

  constructor(
    public columns: Columns,
    public options: TableV2Options = {}
  ) {
    this.validateTable(columns);

    if (options?.indexes) {
      this.indexes = Object.entries(options.indexes).map(([name, columns]) => {
        if (name.startsWith('-')) {
          return new Index({
            name: name.substring(1),
            columns: columns.map((c) => new IndexedColumn({ name: c, ascending: false }))
          });
        }

        return new Index({
          name: name,
          columns: columns.map((c) => new IndexedColumn({ name: c, ascending: true }))
        });
      });
    }
  }

  private validateTable(columns: Columns) {
    const columnNames = Object.keys(columns);
    const columnLength = columnNames.length;

    if (columnNames.includes('id')) {
      throw new Error(`An id column is automatically added, custom id columns are not supported`);
    }

    if (columnLength > MAX_AMOUNT_OF_COLUMNS) {
      throw new Error(`TableV2 cannot have more than ${MAX_AMOUNT_OF_COLUMNS} columns`);
    }

    columnNames
      .map((column) => {
        if (InvalidSQLCharacters.test(column)) {
          throw new Error(`Invalid characters in column name: ${column}`);
        }
      })
  }
}
