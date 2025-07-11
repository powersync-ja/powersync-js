import { LockContext } from '../../db/DBAdapter.js';
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
};

export class TriggerManagerImpl implements TriggerManager {
  constructor(protected options: TriggerManagerImplOptions) {}

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

    if (columns && columns.length == 0) {
      throw new Error('At least one column must be specified for the trigger.');
    }

    /**
     * When is a tuple of the query and the parameters.
     */
    const whenCondition = when ? `WHEN ${when}` : '';

    const triggerIds: string[] = [];

    const id = await this.getUUID();

    const jsonFragment = (source: 'NEW' | 'OLD' = 'NEW') =>
      columns
        ? `json_object(${columns.map((col) => `'${col}', json_extract(${source}.data, '$.${col}')`).join(', ')})`
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
          change TEXT,
          timestamp TEXT
        );
      `);

      if (operations.includes(DiffTriggerOperation.INSERT)) {
        const insertTriggerId = `ps_temp_trigger_insert_${id}`;
        triggerIds.push(insertTriggerId);

        await tx.execute(/* sql */ `
          CREATE TEMP TRIGGER ${insertTriggerId} AFTER INSERT ON ${source} ${whenCondition} BEGIN
          INSERT INTO
            ${destination} (id, operation, change, timestamp)
          VALUES
            (
              NEW.id,
              'INSERT',
              ${jsonFragment('NEW')},
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')
            );

          END;
        `);
      }

      if (operations.includes(DiffTriggerOperation.UPDATE)) {
        const updateTriggerId = `ps_temp_trigger_update_${id}`;
        triggerIds.push(updateTriggerId);

        await tx.execute(/* sql */ `
          CREATE TEMP TRIGGER ${updateTriggerId} AFTER
          UPDATE ON ${source} ${whenCondition} BEGIN
          INSERT INTO
            ${destination} (id, operation, change, timestamp)
          VALUES
            (
              NEW.id,
              'UPDATE',
              --- Reports both the new and old values in JSON format
              json_object (
                'new',
                ${jsonFragment('NEW')},
                'old',
                ${jsonFragment('OLD')}
              ),
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')
            );

          END;
        `);
      }

      if (operations.includes(DiffTriggerOperation.DELETE)) {
        const deleteTriggerId = `ps_temp_trigger_delete_${id}`;
        triggerIds.push(deleteTriggerId);

        // Create delete trigger for basic JSON
        await tx.execute(/* sql */ `
          CREATE TEMP TRIGGER ${deleteTriggerId} AFTER DELETE ON ${source} ${whenCondition} BEGIN
          INSERT INTO
            ${destination} (id, operation, timestamp)
          VALUES
            (
              NEW.id,
              'DELETE',
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')
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
    const { source, filter, columns, operations, hooks } = options;

    await this.db.waitForReady();

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
              getAll: async <T>(query, params) => {
                // Wrap the query to expose the destination table
                const wrappedQuery = /* sql */ `
                  WITH
                    DIFF AS (
                      SELECT
                        *
                      FROM
                        ${destination}
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
        columns,
        operations,
        when: filter,
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
