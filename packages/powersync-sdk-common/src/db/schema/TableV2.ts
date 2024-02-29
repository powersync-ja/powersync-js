import { Column, ColumnType } from '../Column';
import { Index } from './Index';
import { IndexedColumn } from './IndexedColumn';
import { Table as OldTable } from './Table';

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

export type RowType<T extends Table<any>> = {
  id: string;
} & {
  [K in keyof T['columns']]: T['columns'][K]['_template'];
};

export type IndexShorthand = Record<string, string[]>;

/*
  Generate a new table from the columns and indexes
*/
export class Table<Columns extends ColumnsType> {
  columns: Columns;
  indexes: Index[];

  constructor(columns: Columns, indexes: Index[] = []) {
    this.columns = columns;
    this.indexes = indexes;
  }

  table(name: string) {
    return new OldTable({
      name,
      columns: Object.entries(this.columns).map(([name, col]) => new Column({ name: name, type: col.type }))
    });
  }

  indexed(indexes: IndexShorthand) {
    return new Table(
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
