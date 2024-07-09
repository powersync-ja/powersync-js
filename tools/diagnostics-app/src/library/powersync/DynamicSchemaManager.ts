import { Column, ColumnType, DBAdapter, OpTypeEnum, Schema, SyncDataBatch, Table } from '@powersync/web';
import { AppSchema } from './AppSchema';
import { JsSchemaGenerator } from './JsSchemaGenerator';

/**
 * Record fields from downloaded data, then build a schema from it.
 */
export class DynamicSchemaManager {
  private tables: Record<string, Record<string, ColumnType>>;
  private dirty = false;

  constructor() {
    const tables = localStorage.getItem('powersync_dynamic_schema');
    this.tables = tables ? JSON.parse(tables) : {};
  }

  async clear() {
    this.tables = {};
    this.dirty = true;
    localStorage.removeItem('powersync_dynamic_schema');
  }

  async updateFromOperations(batch: SyncDataBatch) {
    let schemaDirty = false;
    for (const bucket of batch.buckets) {
      // Build schema
      for (const op of bucket.data) {
        if (op.op.value == OpTypeEnum.PUT && op.data != null) {
          this.tables[op.object_type!] ??= {};
          const table = this.tables[op.object_type!];
          const data = JSON.parse(op.data);
          for (const [key, value] of Object.entries(data)) {
            if (key == 'id') {
              continue;
            }
            const existing = table[key];
            if (
              typeof value == 'number' &&
              Number.isInteger(value) &&
              existing != ColumnType.REAL &&
              existing != ColumnType.TEXT
            ) {
              if (table[key] != ColumnType.INTEGER) {
                schemaDirty = true;
              }
              table[key] = ColumnType.INTEGER;
            } else if (typeof value == 'number' && existing != ColumnType.TEXT) {
              if (table[key] != ColumnType.REAL) {
                schemaDirty = true;
              }
              table[key] = ColumnType.REAL;
            } else if (typeof value == 'string') {
              if (table[key] != ColumnType.TEXT) {
                schemaDirty = true;
              }
              table[key] = ColumnType.TEXT;
            }
          }
        }
      }
    }
    if (schemaDirty) {
      localStorage.setItem('powersync_dynamic_schema', JSON.stringify(this.tables));
      this.dirty = true;
    }
  }

  async refreshSchema(db: DBAdapter) {
    if (this.dirty) {
      const json = this.buildSchema().toJSON();
      await db.execute('SELECT powersync_replace_schema(?)', [JSON.stringify(json)]);
      this.dirty = false;
      console.log('Updated dynamic schema:', this.tables);
    }
  }

  buildSchema(): Schema {
    const base = AppSchema;

    const tables = [...base.tables];

    for (const [key, value] of Object.entries(this.tables)) {
      const table = new Table({
        name: key,
        columns: Object.entries(value).map(
          ([cname, ctype]) =>
            new Column({
              name: cname,
              type: ctype
            })
        )
      });
      tables.push(table);
    }
    return new Schema(tables);
  }

  schemaToString() {
    const filtered = this.buildSchema().tables.filter((table) => !table.localOnly);
    return new JsSchemaGenerator().generate(new Schema(filtered));
  }
}
