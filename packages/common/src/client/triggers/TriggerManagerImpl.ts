import { LockContext } from '../../db/DBAdapter.js';
import { Schema } from '../../db/schema/Schema.js';
import { type AbstractPowerSyncDatabase } from '../AbstractPowerSyncDatabase.js';
import {
  CreateDiffTriggerOptions,
  DiffTriggerOperation,
  TrackDiffOptions,
  TriggerManager,
  TriggerRemoveCallback
} from './TriggerManager.js';

export type TriggerManagerImplOptions = {
  db: AbstractPowerSyncDatabase;
  schema: Schema;
};

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

  async createDiffTrigger(options: CreateDiffTriggerOptions) {
    await this.db.waitForReady();
    const { source, destination, columns, operations, when, hooks } = options;

    if (operations.length == 0) {
      throw new Error('At least one operation must be specified for the trigger.');
    }

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

    const invalidWhenOperations =
      when && Object.keys(when).filter((operation) => operations.includes(operation as DiffTriggerOperation) == false);
    if (invalidWhenOperations?.length) {
      throw new Error(
        `Invalid 'when' conditions provided for operations: ${invalidWhenOperations.join(', ')}. ` +
          `These operations are not included in the 'operations' array: ${operations.join(', ')}.`
      );
    }

    const whenConditions = Object.fromEntries(
      Object.values(DiffTriggerOperation).map((operation) => [
        operation,
        when?.[operation] ? `WHEN ${when[operation]}` : ''
      ])
    ) as Record<DiffTriggerOperation, string>;

    const triggerIds: string[] = [];

    const id = await this.getUUID();

    /**
     * We default to replicating all columns if no columns array is provided.
     */
    const jsonFragment = (source: 'NEW' | 'OLD' = 'NEW') =>
      columns
        ? `json_object(${replicatedColumns.map((col) => `'${col}', json_extract(${source}.data, '$.${col}')`).join(', ')})`
        : `${source}.data`;

    /**
     * Declare the cleanup function early since if any of the init steps fail,
     * we need to ensure we can cleanup the created resources.
     * We unfortunately cannot rely on transaction rollback.
     */
    const cleanup = async () =>
      this.db.writeLock(async (tx) => {
        await this.removeTriggers(tx, triggerIds);
        await tx.execute(/* sql */ `DROP TABLE IF EXISTS ${destination};`);
      });

    const setup = async (tx: LockContext) => {
      // Allow user code to execute in this lock context before the trigger is created.
      await hooks?.beforeCreate?.(tx);
      await tx.execute(/* sql */ `
        CREATE TEMP TABLE ${destination} (
          id TEXT,
          operation TEXT,
          timestamp TEXT,
          value TEXT,
          previous_value TEXT
        );
      `);

      if (operations.includes(DiffTriggerOperation.INSERT)) {
        const insertTriggerId = `ps_temp_trigger_insert_${id}`;
        triggerIds.push(insertTriggerId);

        await tx.execute(/* sql */ `
          CREATE TEMP TRIGGER ${insertTriggerId} AFTER INSERT ON ${internalSource} ${whenConditions[
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
          CREATE TEMP TRIGGER ${updateTriggerId} AFTER
          UPDATE ON ${internalSource} ${whenConditions[DiffTriggerOperation.UPDATE]} BEGIN
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
          CREATE TEMP TRIGGER ${deleteTriggerId} AFTER DELETE ON ${internalSource} ${whenConditions[
            DiffTriggerOperation.DELETE
          ]} BEGIN
          INSERT INTO
            ${destination} (id, operation, timestamp, value)
          VALUES
            (
              OLD.id,
              'DELETE',
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'),
              OLD.data
            );

          END;
        `);
      }
    };

    try {
      await this.db.writeLock(setup);
      return cleanup;
    } catch (error) {
      await cleanup();
      throw error;
    }
  }

  async trackTableDiff(options: TrackDiffOptions): Promise<TriggerRemoveCallback> {
    const { source, when, columns, operations, hooks } = options;

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
              withDiff: async <T>(query, params) => {
                // Wrap the query to expose the destination table
                const wrappedQuery = /* sql */ `
                  WITH
                    DIFF AS (
                      SELECT
                        *
                      FROM
                        ${destination}
                      ORDER BY
                        timestamp ASC
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
                        ${contextColumns.map((col) => `json_extract(value, '$.${col}') as ${col}`).join(', ')},
                        operation as __operation,
                        timestamp as __timestamp,
                        previous_value as __previous_value
                      FROM
                        ${destination}
                      ORDER BY
                        __timestamp ASC
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
      { tables: [destination], signal: abortController.signal }
    );

    try {
      const removeTrigger = await this.createDiffTrigger({
        source,
        destination,
        columns: contextColumns,
        operations,
        when,
        hooks
      });

      return async () => {
        abortOnChange();
        await removeTrigger();
      };
    } catch (error) {
      abortOnChange();
      throw error;
    }
  }
}
