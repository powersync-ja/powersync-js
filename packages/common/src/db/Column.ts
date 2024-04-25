// https://www.sqlite.org/lang_expr.html#castexpr
export enum ColumnType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  REAL = 'REAL'
}

export interface ColumnOptions {
  name: string;
  type?: ColumnType;
}

export class Column {
  constructor(protected options: ColumnOptions) {}

  get name() {
    return this.options.name;
  }

  get type() {
    return this.options.type;
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type
    };
  }
}
