import { RawTable, RawTableType } from './RawTable.js';
import { RowType, Table } from './Table.js';

type SchemaType = Record<string, Table<any>>;

export type SchemaTableType<S extends SchemaType> = {
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
  readonly tables: Table[];
  readonly rawTables: RawTable[];

  constructor(tables: Table[] | S) {
    if (Array.isArray(tables)) {
      /*
        We need to validate that the tables have a name here because a user could pass in an array
        of Tables that don't have a name because they are using the V2 syntax.
        Therefore, 'convertToClassicTables' won't be called on the tables resulting in a runtime error.
      */
      for (const table of tables) {
        if (table.name === '') {
          throw new Error(
            "It appears you are trying to create a new Schema with an array instead of an object. Passing in an object instead of an array into 'new Schema()' may resolve your issue."
          );
        }
      }
      this.tables = tables;
    } else {
      this.props = tables as S;
      this.tables = this.convertToClassicTables(this.props);
    }

    this.rawTables = [];
  }

  /**
   * Adds raw tables to this schema. Raw tables are identified by their name, but entirely managed by the application
   * developer instead of automatically by PowerSync.
   * Since raw tables are not backed by JSON, running complex queries on them may be more efficient. Further, they allow
   * using client-side table and column constraints.
   * Note that raw tables are only supported when using the new `SyncClientImplementation.rust` sync client.
   *
   * @param tables An object of (table name, raw table definition) entries.
   * @experimental Note that the raw tables API is still experimental and may change in the future.
   */
  withRawTables(tables: Record<string, RawTableType>) {
    for (const [name, rawTableDefinition] of Object.entries(tables)) {
      this.rawTables.push(new RawTable(name, rawTableDefinition));
    }
  }

  validate() {
    for (const table of this.tables) {
      table.validate();
    }
  }

  toJSON() {
    return {
      // This is required because "name" field is not present in TableV2
      tables: this.tables.map((t) => t.toJSON()),
      raw_tables: this.rawTables
    };
  }

  private convertToClassicTables(props: S) {
    return Object.entries(props).map(([name, table]) => {
      return table.copyWithName(name);
    });
  }
}
