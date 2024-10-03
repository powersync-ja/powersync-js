import { IndexedColumn } from './IndexedColumn.js';
import { Table } from './Table.js';

export interface IndexOptions {
  name: string;
  columns?: IndexedColumn[];
}

export const DEFAULT_INDEX_OPTIONS: Partial<IndexOptions> = {
  columns: []
};

export class Index {
  static createAscending(options: IndexOptions, columnNames: string[]) {
    return new Index({
      ...options,
      columns: columnNames.map((name) => IndexedColumn.createAscending(name))
    });
  }

  constructor(protected options: IndexOptions) {
    this.options = { ...DEFAULT_INDEX_OPTIONS, ...options };
  }

  get name() {
    return this.options.name;
  }

  get columns() {
    return this.options.columns ?? [];
  }

  toJSON(table: Table) {
    return {
      name: this.name,
      columns: this.columns.map((c) => c.toJSON(table))
    };
  }
}
