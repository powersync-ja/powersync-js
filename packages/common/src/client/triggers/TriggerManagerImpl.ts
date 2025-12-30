import { LockContext } from '../../db/DBAdapter.js';
import { Schema } from '../../db/schema/Schema.js';
import { type AbstractPowerSyncDatabase } from '../AbstractPowerSyncDatabase.js';
import { DEFAULT_WATCH_THROTTLE_MS } from '../watched/WatchedQuery.js';
import {
  CreateDiffTriggerOptions,
  DiffTriggerOperation,
  TrackDiffOptions,
  TriggerHoldManager,
  TriggerManager,
  TriggerRemoveCallback,
  WithDiffOptions
} from './TriggerManager.js';

export type TriggerManagerImplOptions = {
  db: AbstractPowerSyncDatabase;
  schema: Schema;
  holdManager: TriggerHoldManager;
  usePersistenceByDefault?: () => Promise<boolean>;
};

/**
 * A record of persisted table/trigger information.
 * This is used for fail-safe cleanup.
 */
type TrackedTableRecord = {
  /**
   * The id of the trigger. This is used in the SQLite trigger name
   */
  id: string;
  /**
   * The destination table name for the trigger
   */
  table: string;
};

const TRIGGER_TABLE_TRACKING_KEY = 'powersync_tables_to_cleanup';

/**
 * @internal
 * @experimental
 */
export class TriggerManagerImpl implements TriggerManager {
  protected schema: Schema;

  constructor(protected options: TriggerManagerImplOptions) {
    this.schema = options.schema;
    options.db.registerListener({
      schemaChanged: (schema) => {
        this.schema = schema;
      }
    });
  }

  protected get db() {
    return this.options.db;
  }

  protected async getUUID() {
    const { id: uuid } = await this.db.get<{ id: string }>(/* sql */ `
      SELECT
        uuid () as id
    `);

    // Replace dashes with underscores for SQLite table/trigger name compatibility
    return uuid.replace(/-/g, '_');
  }

  protected async removeTriggers(tx: LockContext, triggerIds: string[]) {
    for (const triggerId of triggerIds) {
      await tx.execute(/* sql */ `DROP TRIGGER IF EXISTS ${triggerId}; `);
    }
  }

  async cleanupStaleItems() {
    await this.db.writeLock(async (ctx) => {
      const storedRecords = await ctx.getOptional<{ value: string }>(
        /* sql */ `
          SELECT
            value
          FROM
            ps_kv
          WHERE
            key = ?
        `,
        [TRIGGER_TABLE_TRACKING_KEY]
      );
      if (!storedRecords) {
        // There is nothing to cleanup
        return;
      }
      const trackedItems = JSON.parse(storedRecords.value) as TrackedTableRecord[];
      if (trackedItems.length == 0) {
        // There is nothing to cleanup
        return;
      }

      for (const trackedItem of trackedItems) {
        // check if there is anything holding on to this item
        const hasHold = await this.options.holdManager.checkHold(trackedItem.id);
        if (hasHold) {
          // This does not require cleanup
          continue;
        }

        // We need to delete the table and triggers
        const triggerNames = Object.values(DiffTriggerOperation).map(
          (value) => `ps_temp_trigger_${value.toLowerCase()}_${trackedItem.id}`
        );
        for (const triggerName of triggerNames) {
          // The trigger might not actually exist, we don't track each trigger name and we test all permutations
          await ctx.execute(`DROP TRIGGER IF EXISTS ${triggerName}`);
        }
        await ctx.execute(`DROP TABLE IF EXISTS ${trackedItem.table}`);
      }
    });
  }

  async createDiffTrigger(options: CreateDiffTriggerOptions) {
    await this.db.waitForReady();
    const {
      source,
      destination,
      columns,
      when,
      hooks,
      // Fall back to the provided default if not given on this level
      usePersistence = await this.options.usePersistenceByDefault?.()
    } = options;
    const operations = Object.keys(when) as DiffTriggerOperation[];
    if (operations.length == 0) {
      throw new Error('At least one WHEN operation must be specified for the trigger.');
    }

    /**
     * The clause to use when executing
     * CREATE ${tableTriggerTypeClause} TABLE
     * OR
     * CREATE ${tableTriggerTypeClause} TRIGGER
     */
    const tableTriggerTypeClause = !usePersistence ? 'TEMP' : '';

    const whenClauses = Object.fromEntries(
      Object.entries(when).map(([operation, filter]) => [operation, `WHEN ${filter}`])
    );

    /**
     * Allow specifying the View name as the source.
     * We can lookup the internal table name from the schema.
     */
    const sourceDefinition = this.schema.tables.find((table) => table.viewName == source);
    if (!sourceDefinition) {
      throw new Error(`Source table or view "${source}" not found in the schema.`);
    }

    const replicatedColumns = columns ?? sourceDefinition.columns.map((col) => col.name);

    const internalSource = sourceDefinition.internalName;
    const triggerIds: string[] = [];

    const id = await this.getUUID();

    const releasePersistenceHold = usePersistence ? await this.options.holdManager.obtainHold(id) : null;

    /**
     * We default to replicating all columns if no columns array is provided.
     */
    const jsonFragment = (source: 'NEW' | 'OLD' = 'NEW') => {
      if (columns == null) {
        // Track all columns
        return `${source}.data`;
      } else if (columns.length == 0) {
        // Don't track any columns except for the id
        return `'{}'`;
      } else {
        // Filter the data by the replicated columns
        return `json_object(${replicatedColumns.map((col) => `'${col}', json_extract(${source}.data, '$.${col}')`).join(', ')})`;
      }
    };

    const disposeWarningListener = this.db.registerListener({
      schemaChanged: () => {
        this.db.logger.warn(
          `The PowerSync schema has changed while previously configured triggers are still operational. This might cause unexpected results.`
        );
      }
    });

    /**
     * Declare the cleanup function early since if any of the init steps fail,
     * we need to ensure we can cleanup the created resources.
     * We unfortunately cannot rely on transaction rollback.
     */
    const cleanup = async () => {
      disposeWarningListener();
      return this.db.writeLock(async (tx) => {
        await this.removeTriggers(tx, triggerIds);
        await tx.execute(/* sql */ `DROP TABLE IF EXISTS ${destination};`);
        if (usePersistence) {
          // Remove these triggers and tables from the list of items to safeguard cleanup for.
          await tx.execute(
            /* sql */ `
              UPDATE ps_kv
              SET
                value = (
                  SELECT
                    json_group_array (json_each.value)
                  FROM
                    json_each (value)
                  WHERE
                    json_extract (json_each.value, '$.id') != ?
                )
              WHERE
                key = ?;
            `,
            [id, TRIGGER_TABLE_TRACKING_KEY]
          );

          // Remove the key when the array becomes empty
          await tx.execute(
            /* sql */ `
              DELETE FROM ps_kv
              WHERE
                key = ?
                AND value IS NULL;
            `,
            [TRIGGER_TABLE_TRACKING_KEY]
          );
        }

        await releasePersistenceHold?.();
      });
    };

    const setup = async (tx: LockContext) => {
      // Allow user code to execute in this lock context before the trigger is created.
      await hooks?.beforeCreate?.(tx);
      await tx.execute(/* sql */ `
        CREATE ${tableTriggerTypeClause} TABLE ${destination} (
          operation_id INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT,
          operation TEXT,
          timestamp TEXT,
          value TEXT,
          previous_value TEXT
        );
      `);

      if (usePersistence) {
        /**
         * Register the table for cleanup management
         * Store objects of the form { id: string, table: string } in the JSON array.
         */
        await tx.execute(
          /* sql */ `
            INSERT INTO
              ps_kv (key, value)
            VALUES
              (?, json_array (json_object ('id', ?, 'table', ?))) ON CONFLICT (key) DO
            UPDATE
            SET
              value = json_insert (
                value,
                '$[' || json_array_length (value) || ']',
                json_object ('id', ?, 'table', ?)
              );
          `,
          [TRIGGER_TABLE_TRACKING_KEY, id, destination, id, destination]
        );
      }

      if (operations.includes(DiffTriggerOperation.INSERT)) {
        const insertTriggerId = `ps_temp_trigger_insert_${id}`;
        triggerIds.push(insertTriggerId);

        await tx.execute(/* sql */ `
          CREATE ${tableTriggerTypeClause} TRIGGER ${insertTriggerId} AFTER INSERT ON ${internalSource} ${whenClauses[
            DiffTriggerOperation.INSERT
          ]} BEGIN
          INSERT INTO
            ${destination} (id, operation, timestamp, value)
          VALUES
            (
              NEW.id,
              'INSERT',
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'),
              ${jsonFragment('NEW')}
            );

          END;
        `);
      }

      if (operations.includes(DiffTriggerOperation.UPDATE)) {
        const updateTriggerId = `ps_temp_trigger_update_${id}`;
        triggerIds.push(updateTriggerId);

        await tx.execute(/* sql */ `
          CREATE ${tableTriggerTypeClause} TRIGGER ${updateTriggerId} AFTER
          UPDATE ON ${internalSource} ${whenClauses[DiffTriggerOperation.UPDATE]} BEGIN
          INSERT INTO
            ${destination} (id, operation, timestamp, value, previous_value)
          VALUES
            (
              NEW.id,
              'UPDATE',
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'),
              ${jsonFragment('NEW')},
              ${jsonFragment('OLD')}
            );

          END;
        `);
      }

      if (operations.includes(DiffTriggerOperation.DELETE)) {
        const deleteTriggerId = `ps_temp_trigger_delete_${id}`;
        triggerIds.push(deleteTriggerId);

        // Create delete trigger for basic JSON
        await tx.execute(/* sql */ `
          CREATE ${tableTriggerTypeClause} TRIGGER ${deleteTriggerId} AFTER DELETE ON ${internalSource} ${whenClauses[
            DiffTriggerOperation.DELETE
          ]} BEGIN
          INSERT INTO
            ${destination} (id, operation, timestamp, value)
          VALUES
            (
              OLD.id,
              'DELETE',
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'),
              ${jsonFragment('OLD')}
            );

          END;
        `);
      }
    };

    try {
      await this.db.writeLock(setup);
      return cleanup;
    } catch (error) {
      try {
        await cleanup();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Error during operation and cleanup');
      }
      throw error;
    }
  }

  async trackTableDiff(options: TrackDiffOptions): Promise<TriggerRemoveCallback> {
    const { source, when, columns, hooks, throttleMs = DEFAULT_WATCH_THROTTLE_MS } = options;

    await this.db.waitForReady();

    /**
     * Allow specifying the View name as the source.
     * We can lookup the internal table name from the schema.
     */
    const sourceDefinition = this.schema.tables.find((table) => table.viewName == source);
    if (!sourceDefinition) {
      throw new Error(`Source table or view "${source}" not found in the schema.`);
    }

    // The columns to present in the onChange context methods.
    // If no array is provided, we use all columns from the source table.
    const contextColumns = columns ?? sourceDefinition.columns.map((col) => col.name);

    const id = await this.getUUID();
    const destination = `ps_temp_track_${source}_${id}`;

    // register an onChange before the trigger is created
    const abortController = new AbortController();
    const abortOnChange = () => abortController.abort();
    this.db.onChange(
      {
        // Note that the onChange events here have their execution scheduled.
        // Callbacks are throttled and are sequential.
        onChange: async () => {
          if (abortController.signal.aborted) return;

          // Run the handler in a write lock to keep the state of the
          // destination table consistent.
          await this.db.writeTransaction(async (tx) => {
            const callbackResult = await options.onChange({
              ...tx,
              destinationTable: destination,
              withDiff: async <T>(query, params, options?: WithDiffOptions) => {
                // Wrap the query to expose the destination table
                const operationIdSelect = options?.castOperationIdAsText
                  ? 'id, operation, CAST(operation_id AS TEXT) as operation_id, timestamp, value, previous_value'
                  : '*';
                const wrappedQuery = /* sql */ `
                  WITH
                    DIFF AS (
                      SELECT
                        ${operationIdSelect}
                      FROM
                        ${destination}
                      ORDER BY
                        operation_id ASC
                    ) ${query}
                `;
                return tx.getAll<T>(wrappedQuery, params);
              },
              withExtractedDiff: async <T>(query, params) => {
                // Wrap the query to expose the destination table
                const wrappedQuery = /* sql */ `
                  WITH
                    DIFF AS (
                      SELECT
                        id,
                        ${contextColumns.length > 0
                    ? `${contextColumns.map((col) => `json_extract(value, '$.${col}') as ${col}`).join(', ')},`
                    : ''} operation_id as __operation_id,
                        operation as __operation,
                        timestamp as __timestamp,
                        previous_value as __previous_value
                      FROM
                        ${destination}
                      ORDER BY
                        __operation_id ASC
                    ) ${query}
                `;
                return tx.getAll<T>(wrappedQuery, params);
              }
            });

            // Clear the destination table after processing
            await tx.execute(/* sql */ `DELETE FROM ${destination};`);
            return callbackResult;
          });
        }
      },
      { tables: [destination], signal: abortController.signal, throttleMs }
    );

    try {
      const removeTrigger = await this.createDiffTrigger({
        source,
        destination,
        columns: contextColumns,
        when,
        hooks
      });

      return async () => {
        abortOnChange();
        await removeTrigger();
      };
    } catch (error) {
      try {
        abortOnChange();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Error during operation and cleanup');
      }
      throw error;
    }
  }
}
