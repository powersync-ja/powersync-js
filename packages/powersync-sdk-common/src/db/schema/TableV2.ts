import { ColumnType } from '../Column';
import { Index } from './Index';
import { IndexedColumn } from './IndexedColumn';

export type BaseColumnType<T extends number | string | null> = {
  type: ColumnType;
  readonly _template: T;
};

const text: BaseColumnType<string | null> = {
  type: ColumnType.TEXT,
  _template: ''
};

const integer: BaseColumnType<number | null> = {
  type: ColumnType.INTEGER,
  _template: 0
};

const real: BaseColumnType<number | null> = {
  type: ColumnType.REAL,
  _template: 0
};

export const column = {
  text,
  integer,
  real
};

export type ColumnsType = Record<string, BaseColumnType<any>>;

export type RowType<T extends TableV2<any>> = {
  id: string;
} & {
  [K in keyof T['columns']]: T['columns'][K]['_template'];
};

export type IndexShorthand = Record<string, string[]>;

/*
  Generate a new table from the columns and indexes
*/
export class TableV2<Columns extends ColumnsType = ColumnsType> {
  constructor(
    public columns: Columns,
    public indexes: Index[] = []
  ) {}

  /**
   * Add indexes to the table by creating a new table with the indexes added
   */
  addIndexes(indexes: IndexShorthand) {
    return new TableV2(
      this.columns,
      this.indexes.concat(
        Object.entries(indexes).map(([name, columns]) => {
          return new Index({
            name: name,
            columns: columns.map((c) => new IndexedColumn({ name: c }))
          });
        })
      )
    );
  }
}
