import { ColumnType } from '../Column';
import { Index } from './Index';
import { IndexedColumn } from './IndexedColumn';

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
}
