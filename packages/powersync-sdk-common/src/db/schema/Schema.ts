import type { Table as OldTable } from './Table';
import { RowType, Table } from './TableV2';

export type SchemaType = Record<string, Table<any>>;

export type SchemaTableType<S extends SchemaType> = {
  [K in keyof S]: RowType<S[K]>;
};

export class Schema<S extends SchemaType> {
  readonly types: SchemaTableType<S>;
  readonly props: S;
  constructor(public tables: OldTable[] | S) {
    if (Array.isArray(tables)) {
      this.tables = tables;
    } else {
      this.props = tables as S;
      this.tables = this.convertToTables(this.props);
    }
  }

  build() {
    return new Schema(this.tables);
  }

  validate() {
    for (const table of this.tables as OldTable[]) {
      table.validate();
    }
  }

  toJSON() {
    return {
      tables: (this.tables as OldTable[]).map((t) => t.toJSON())
    };
  }

  private convertToTables(props: S) {
    return Object.entries(props).map(([name, type]) => {
      return type.table(name);
    });
  }
}
