import { Table as ClassicTable } from './Table';
import { RowType, TableV2 } from './TableV2';

type SchemaType = Record<string, TableV2<any>>;

type SchemaTableType<S extends SchemaType> = {
  [K in keyof S]: RowType<S[K]>;
};

/**
 * A schema is a collection of tables. It is used to define the structure of a database.
 */
export class Schema<S extends SchemaType = SchemaType> {
  /*
    Only available when constructing with mapped typed definition columns
  */
  readonly types: SchemaTableType<S>;
  readonly props: S;
  constructor(public tables: ClassicTable[] | S) {
    if (Array.isArray(tables)) {
      this.tables = tables;
    } else {
      this.props = tables as S;
      this.tables = this.convertToClassicTables(this.props);
    }
  }

  validate() {
    for (const table of this.tables as ClassicTable[]) {
      table.validate();
    }
  }

  toJSON() {
    return {
      tables: (this.tables as ClassicTable[]).map((t) => t.toJSON())
    };
  }

  private convertToClassicTables(props: S) {
    return Object.entries(props).map(([name, table]) => {
      return ClassicTable.createTable(name, table);
    });
  }
}
