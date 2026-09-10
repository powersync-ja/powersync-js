import { ColumnType } from './Column.js';
import { ResolvedTable } from './Table.js';

/**
 * @public
 */
export interface IndexColumnOptions {
  name: string;
  ascending?: boolean;
}

const DEFAULT_INDEX_COLUMN_OPTIONS: Partial<IndexColumnOptions> = {
  ascending: true
};

/**
 * @public
 */
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

  toJSON(table: ResolvedTable) {
    return {
      name: this.name,
      ascending: this.ascending,
      type: table.columns.find((column) => column.name === this.name)?.type ?? ColumnType.TEXT
    };
  }
}
