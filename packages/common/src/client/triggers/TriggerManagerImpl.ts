import { DBAdapter, LockContext } from '../../db/DBAdapter.js';
import { CreateDiffTriggerOptions, DiffTriggerOperation, TriggerManager } from './TriggerManager.js';

export type TriggerManagerImplOptions = {
  db: DBAdapter;
};

export class TriggerManagerImpl implements TriggerManager {
  constructor(protected options: TriggerManagerImplOptions) {}

  protected get db() {
    return this.options.db;
  }

  protected async removeTriggers(tx: LockContext, triggerIds: string[]) {
    for (const triggerId of triggerIds) {
      await tx.execute(/* sql */ `DROP TRIGGER IF EXISTS ${triggerId}; `);
    }
  }

  async createDiffTrigger(options: CreateDiffTriggerOptions) {
    const { source, destination, columns, operations, when } = options;

    if (operations.length == 0) {
      throw new Error('At least one operation must be specified for the trigger.');
    }

    if (columns && columns.length == 0) {
      throw new Error('At least one column must be specified for the trigger.');
    }

    const whenCondition = when ? `WHEN ${when}` : '';

    const { id: uuid } = await this.db.get<{ id: string }>(/* sql */ `
      SELECT
        uuid () as id
    `);

    const id = uuid.replace(/-/g, '_'); // Replace dashes with underscores for SQLite compatibility

    const triggerIds: string[] = [];

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

    try {
      await this.db.writeLock(async (tx) => {
        await tx.execute(/* sql */ `CREATE TEMP TABLE ${destination} (id TEXT, operation TEXT, change TEXT);`);

        if (operations.includes(DiffTriggerOperation.INSERT)) {
          const insertTriggerId = `ps_temp_trigger_insert_${id}`;
          triggerIds.push(insertTriggerId);

          await tx.execute(/* sql */ `
            CREATE TEMP TRIGGER ${insertTriggerId} AFTER INSERT ON ${source} ${whenCondition} BEGIN
            INSERT INTO
              ${destination} (id, operation, change)
            VALUES
              (
                NEW.id,
                'INSERT',
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
            UPDATE ON ${source} ${whenCondition} BEGIN
            INSERT INTO
              ${destination} (id, operation, change)
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
                )
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
              ${destination} (id, operation)
            VALUES
              (NEW.id, 'DELETE');

            END;
          `);
        }
      });
    } catch (error) {
      await cleanup();
      throw error;
    }

    return cleanup;
  }
}
