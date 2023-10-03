import { Column, ColumnType } from '../Column';
import { Table } from './Table';

export interface IndexColumnOptions {
  name: string;
  ascending?: boolean;
}

export const DEFAULT_INDEX_COLUMN_OPTIONS: Partial<IndexColumnOptions> = {
  ascending: true
};

export class IndexedColumn {
  protected options: IndexColumnOptions;

  static createAscending(column: string) {
    return new IndexedColumn({
      name: column,
      ascending: true
    });
  }

  constructor(options: IndexColumnOptions) {
    this.options = { ...DEFAULT_INDEX_COLUMN_OPTIONS, ...options };
  }

  get name() {
    return this.options.name;
  }

  get ascending() {
    return this.options.ascending;
  }

  toJSON(table: Table) {
    return {
      name: this.name,
      ascending: this.ascending,
      type: table.columns.find((column) => column.name === this.name)?.type ?? ColumnType.TEXT
    };
  }
}
