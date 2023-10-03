import { Column } from '../Column';
import type { Index } from './Index';

export interface TableOptions {
  name: string;
  columns: Column[];
  indexes?: Index[];
  localOnly?: boolean;
  insertOnly?: boolean;
}

export const DEFAULT_TABLE_OPTIONS: Partial<TableOptions> = {
  indexes: [],
  insertOnly: false,
  localOnly: false
};

export class Table {
  protected options: TableOptions;

  static createLocalOnly(options: TableOptions) {
    return new Table({ ...options, localOnly: true, insertOnly: true });
  }

  static createInsertOnly(options: TableOptions) {
    return new Table({ ...options, localOnly: false, insertOnly: true });
  }

  constructor(options: TableOptions) {
    this.options = { ...DEFAULT_TABLE_OPTIONS, ...options };
  }

  get name() {
    return this.options.name;
  }

  get columns() {
    return this.options.columns;
  }

  get indexes() {
    return this.options.indexes;
  }

  get localOnly() {
    return this.options.localOnly;
  }

  get insertOnly() {
    return this.options.insertOnly;
  }

  get internalName() {
    if (this.options.localOnly) {
      return `ps_data_local__${this.name}`;
    } else {
      return `ps_data__${this.name}`;
    }
  }

  get validName() {
    // TODO verify
    return !/[\"\'%,\.#\s\[\]]/.test(this.name);
  }

  toJSON() {
    return {
      name: this.name,
      local_only: this.localOnly,
      insert_only: this.insertOnly,
      columns: this.columns.map((c) => c.toJSON()),
      indexes: this.indexes.map((e) => e.toJSON(this))
    };
  }
}
