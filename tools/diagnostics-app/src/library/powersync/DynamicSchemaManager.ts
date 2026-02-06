import {
  AbstractPowerSyncDatabase,
  Column,
  ColumnType,
  OpTypeEnum,
  Schema,
  SyncDataBatch,
  Table
} from '@powersync/web';
import { AppSchema } from './AppSchema';
import { JsSchemaGenerator } from './JsSchemaGenerator';
import { localStateDb } from './LocalStateManager';

const APP_SETTINGS_KEY_DYNAMIC_SCHEMA = 'dynamic_schema';

/**
 * Record fields from downloaded data, then build a schema from it.
 * Persists to local DB (app_settings.dynamic_schema), not localStorage.
 */
export class DynamicSchemaManager {
  private tables: Record<string, Record<string, ColumnType>> = {};
  private dirty = false;
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingDb: AbstractPowerSyncDatabase | null = null;

  /**
   * Load dynamic schema from local DB. Call after localStateDb is initialized (e.g. before connect).
   */
  async loadFromDb(): Promise<void> {
    const rows = await localStateDb.getAll<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [APP_SETTINGS_KEY_DYNAMIC_SCHEMA]
    );
    const row = rows[0];
    if (row?.value) {
      this.tables = JSON.parse(row.value);
      this.dirty = true;
    }
  }

  async clear() {
    this.tables = {};
    this.dirty = true;
    await localStateDb.execute('DELETE FROM app_settings WHERE key = ?', [APP_SETTINGS_KEY_DYNAMIC_SCHEMA]);
  }

  private async persistSchema(): Promise<void> {
    await localStateDb.execute(
      'INSERT OR REPLACE INTO app_settings (id, key, value) VALUES (?, ?, ?)',
      [APP_SETTINGS_KEY_DYNAMIC_SCHEMA, APP_SETTINGS_KEY_DYNAMIC_SCHEMA, JSON.stringify(this.tables)]
    );
  }

  /**
   * @returns true if schema was updated (caller should call refreshSchema)
   */
  async updateFromOperations(batch: SyncDataBatch): Promise<boolean> {
    let schemaDirty = false;
    for (const bucket of batch.buckets) {
      for (const op of bucket.data) {
        if (op.op.value == OpTypeEnum.PUT && op.data != null) {
          this.tables[op.object_type!] ??= {};
          const table = this.tables[op.object_type!];
          const data = JSON.parse(op.data);
          for (const [key, value] of Object.entries(data)) {
            if (key == 'id') continue;
            const existing = table[key];
            if (
              typeof value == 'number' &&
              Number.isInteger(value) &&
              existing != ColumnType.REAL &&
              existing != ColumnType.TEXT
            ) {
              if (table[key] != ColumnType.INTEGER) schemaDirty = true;
              table[key] = ColumnType.INTEGER;
            } else if (typeof value == 'number' && existing != ColumnType.TEXT) {
              if (table[key] != ColumnType.REAL) schemaDirty = true;
              table[key] = ColumnType.REAL;
            } else if (typeof value == 'string') {
              if (table[key] != ColumnType.TEXT) schemaDirty = true;
              table[key] = ColumnType.TEXT;
            }
          }
        }
      }
    }
    if (schemaDirty) {
      this.dirty = true;
      await this.persistSchema();
    }
    return schemaDirty;
  }

  /**
   * Apply schema to db. Debounced so we don't call db.updateSchema() on every sync batch
   * (updateFromOperations can fire many times per second during sync).
   */
  async refreshSchema(db: AbstractPowerSyncDatabase) {
    if (!this.dirty) return;
    this.pendingDb = db;
    if (this.refreshTimeout != null) return;
    const debounceMs = 150;
    this.refreshTimeout = setTimeout(() => {
      this.refreshTimeout = null;
      const target = this.pendingDb;
      this.pendingDb = null;
      if (target) {
        this.dirty = false;
        target.updateSchema(this.buildSchema());
      }
    }, debounceMs);
  }

  /** Call when refresh must run immediately (e.g. after connect). */
  async refreshSchemaNow(db: AbstractPowerSyncDatabase) {
    if (this.refreshTimeout != null) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
      this.pendingDb = null;
    }
    if (this.dirty) {
      this.dirty = false;
      await db.updateSchema(this.buildSchema());
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
