import { LockContext } from '../../db/DBAdapter.js';
import { Schema } from '../../db/schema/Schema.js';
import type { AbstractPowerSyncDatabase } from '../AbstractPowerSyncDatabase.js';
import { DEFAULT_WATCH_THROTTLE_MS } from '../watched/WatchedQuery.js';
import {
  CreateDiffTriggerOptions,
  DiffTriggerOperation,
  TrackDiffOptions,
  TriggerManager,
  TriggerManagerConfig,
  TriggerRemoveCallback,
  WithDiffOptions
} from './TriggerManager.js';

export type TriggerManagerImplOptions = TriggerManagerConfig & {
  db: AbstractPowerSyncDatabase;
  schema: Schema;
};

export type TriggerManagerImplConfiguration = {
  useStorageByDefault: boolean;
};

export const DEFAULT_TRIGGER_MANAGER_CONFIGURATION: TriggerManagerImplConfiguration = {
  useStorageByDefault: false
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

const TRIGGER_CLEANUP_INTERVAL_MS = 120_000; // 2 minutes

/**
 * @internal
 * @experimental
 */
export class TriggerManagerImpl implements TriggerManager {
  protected schema: Schema;

  protected defaultConfig: TriggerManagerImplConfiguration;
  protected cleanupTimeout: ReturnType<typeof setTimeout> | null;
  protected isDisposed: boolean;

  constructor(protected options: TriggerManagerImplOptions) {
    this.schema = options.schema;
    options.db.registerListener({
      schemaChanged: (schema) => {
        this.schema = schema;
      }
    });
    this.isDisposed = false;

    /**
     * Configure a cleanup to run on an interval.
     * The interval is configured using setTimeout to take the async
     * execution time of the callback into account.
     */
    this.defaultConfig = DEFAULT_TRIGGER_MANAGER_CONFIGURATION;
    const cleanupCallback = async () => {
      this.cleanupTimeout = null;
      if (this.isDisposed) {
        return;
      }
      try {
        await this.cleanupResources();
      } catch (ex) {
        this.db.logger.error(`Caught error while attempting to cleanup triggers`, ex);
      } finally {
        // if not closed, set another timeout
        if (this.isDisposed) {
          return;
        }
        this.cleanupTimeout = setTimeout(cleanupCallback, TRIGGER_CLEANUP_INTERVAL_MS);
      }
    };
    this.cleanupTimeout = setTimeout(cleanupCallback, TRIGGER_CLEANUP_INTERVAL_MS);
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

  dispose() {
    this.isDisposed = true;
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
  }

  /**
   * Updates default config settings for platform specific use-cases.
   */
  updateDefaults(config: TriggerManagerImplConfiguration) {
    this.defaultConfig = {
      ...this.defaultConfig,
      ...config
    };
  }

  protected generateTriggerName(operation: DiffTriggerOperation, destinationTable: string, triggerId: string) {
    return `__ps_temp_trigger_${operation.toLowerCase()}__${destinationTable}__${triggerId}`;
  }

  /**
   * Cleanup any SQLite triggers or tables that are no longer in use.
   */
  async cleanupResources() {
    // we use the database here since cleanupResources is called during the PowerSyncDatabase initialization
    await this.db.database.writeLock(async (ctx) => {
      // Query sqlite_master directly to find all persisted triggers and extract destination/id
      // Trigger naming convention: __ps_temp_trigger_<operation>__<destination>__<id>
      // - Compute start index after the second '__' (after operation) as a CTE for clarity
      //   _start_index = instr(substr(name, 3), '__') + 4
      //   (add 2 to account for removed leading '__', plus 2 to skip the '__' before destination)
      // - Destination length excludes the trailing '__' + 36-char UUID: length(name) - _start_index - 37
      // - UUID is always last 36 chars
      const trackedItems = await ctx.getAll<TrackedTableRecord>(/* sql */ `
        WITH
          trigger_names AS (
            SELECT
              name,
              instr (substr (name, 3), '__') + 4 AS _start_index
            FROM
              sqlite_master
            WHERE
              type = 'trigger'
              AND name LIKE '__ps_temp_trigger_%'
          )
        SELECT DISTINCT
          substr (
            name,
            _start_index,
            length (name) - _start_index - 37
          ) AS "table",
          substr (name, -36) AS id
        FROM
          trigger_names
      `);

      for (const trackedItem of trackedItems) {
        // check if there is anything holding on to this item
        const hasClaim = await this.options.claimManager.checkClaim(trackedItem.id);
        if (hasClaim) {
          // This does not require cleanup
          continue;
        }

        this.db.logger.debug(`Clearing resources for trigger ${trackedItem.id} with table ${trackedItem.table}`);

        // We need to delete the triggers and table
        const triggerNames = Object.values(DiffTriggerOperation).map((operation) =>
          this.generateTriggerName(operation, trackedItem.table, trackedItem.id)
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
      useStorage = this.defaultConfig.useStorageByDefault
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
    const tableTriggerTypeClause = !useStorage ? 'TEMP' : '';

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

    const releaseStorageClaim = useStorage ? await this.options.claimManager.obtainClaim(id) : null;

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
        await releaseStorageClaim?.();
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
        )
      `);

      if (operations.includes(DiffTriggerOperation.INSERT)) {
        const insertTriggerId = this.generateTriggerName(DiffTriggerOperation.INSERT, destination, id);
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

          END
        `);
      }

      if (operations.includes(DiffTriggerOperation.UPDATE)) {
        const updateTriggerId = this.generateTriggerName(DiffTriggerOperation.UPDATE, destination, id);
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
        const deleteTriggerId = this.generateTriggerName(DiffTriggerOperation.DELETE, destination, id);
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
    const destination = `__ps_temp_track_${source}_${id}`;

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
