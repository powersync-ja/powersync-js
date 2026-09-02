import { Column } from './Column.js';
import { Index } from './Index.js';
import { IndexedColumn } from './IndexedColumn.js';
import { encodeTableOptions } from './internal.js';
import { RawTable, RawTableType } from './RawTable.js';
import type { SerializedSchema } from './SerializedSchema.js';
import { ResolvedTable, RowType, Table } from './Table.js';

type SchemaType = Record<string, Table<any>>;

/**
 * @public
 */
export type SchemaTableType<S extends SchemaType> = {
  [K in keyof S]: RowType<S[K]>;
};

/**
 * A schema is a collection of tables. It is used to define the structure of a database.
 *
 * @public
 */
export class Schema<S extends SchemaType = SchemaType> {
  /*
    Only available when constructing with mapped typed definition columns
  */
  readonly types!: SchemaTableType<S>;
  readonly props!: S;
  readonly tables: ResolvedTable[];
  readonly rawTables: RawTable[];

  constructor(tables: ResolvedTable[] | S) {
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
      // Update the table entries with the provided table name key
      this.props = Object.fromEntries(
        Object.entries(tables).map(([tableName, table]) => [tableName, table.copyWithName(tableName)])
      ) as S;
      this.tables = Object.values(this.props);
    }

    this.rawTables = [];
  }

  /**
   * Adds raw tables to this schema. Raw tables are identified by their name, but entirely managed by the application
   * developer instead of automatically by PowerSync.
   * Since raw tables are not backed by JSON, running complex queries on them may be more efficient. Further, they allow
   * using client-side table and column constraints.
   *
   * @param tables - An object of (table name, raw table definition) entries.
   */
  withRawTables(tables: Record<string, RawTableType>) {
    for (const [name, rawTableDefinition] of Object.entries(tables)) {
      this.rawTables.push({ name, ...rawTableDefinition });
    }
  }

  validate() {
    for (const table of this.tables) {
      table.validate();
    }
  }

  toJSON(): unknown {
    return {
      tables: this.tables.map((t) => t.toJSON()),
      raw_tables: this.rawTables.map(Schema.rawTableToJson)
    };
  }

  /**
   * Produces a complete, typed, round-trippable serialization of this schema — every table option,
   * column, and index. Unlike {@link Schema.toJSON} (the core-extension payload), the result can be
   * inspected and passed back to {@link Schema.fromSerialized}.
   */
  serialize(): SerializedSchema {
    return {
      tables: this.tables.map((table) => table.serialize()),
      rawTables: this.rawTables.map((table) => ({ name: table.name }))
    };
  }

  /**
   * Reconstructs a {@link Schema} from the output of {@link Schema.serialize}. Raw tables are not
   * reconstructed (they are managed by the application, not by the serialized representation).
   */
  static fromSerialized(serialized: SerializedSchema): Schema {
    const tables = serialized.tables.map(
      (table) =>
        new ResolvedTable({
          name: table.name,
          viewName: table.viewNameOverride,
          localOnly: table.localOnly,
          insertOnly: table.insertOnly,
          trackPrevious: table.trackPrevious,
          trackMetadata: table.trackMetadata,
          ignoreEmptyUpdates: table.ignoreEmptyUpdates,
          columns: table.columns.map((column) => new Column({ name: column.name, type: column.type })),
          indexes: table.indexes.map(
            (index) =>
              new Index({
                name: index.name,
                columns: index.columns.map(
                  (column) => new IndexedColumn({ name: column.name, ascending: column.ascending })
                )
              })
          )
        })
    );
    return new Schema(tables);
  }

  /**
   * Returns a representation of the raw table that is understood by the PowerSync SQLite core extension.
   *
   * The output of this can be passed through `JSON.serialize` and then used in `powersync_create_raw_table_crud_trigger`
   * to define triggers for this table.
   */
  static rawTableToJson(table: RawTable): unknown {
    const serialized: any = {
      name: table.name,
      put: table.put,
      delete: table.delete,
      clear: table.clear
    };
    if ('schema' in table) {
      // We have schema options, those are flattened into the outer JSON object for the core extension.
      const schema = table.schema;
      serialized.table_name = schema.tableName ?? table.name;
      serialized.synced_columns = schema.syncedColumns;
      Object.assign(serialized, encodeTableOptions(table.schema));
    }

    return serialized;
  }
}
