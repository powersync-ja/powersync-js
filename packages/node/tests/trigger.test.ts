import { DiffTriggerOperation, TriggerDiffRecord } from '@powersync/common';
// import 'source-map-support/register';
import { describe, expect, vi } from 'vitest';
import { Database, databaseTest } from './utils';

describe('Triggers', () => {
  /**
   * Tests a diff trigger for a table.
   * The triggered results are watched manually.
   */
  databaseTest('Diff triggers should track table changes', { timeout: 100_000 }, async ({ database }) => {
    const tempTable = 'temp_remote_lists';

    await database.triggers.createDiffTrigger({
      source: 'lists',
      destination: tempTable,
      columns: ['name'],
      operations: [DiffTriggerOperation.INSERT, DiffTriggerOperation.UPDATE]
    });

    const results = [] as TriggerDiffRecord[];

    database.onChange(
      {
        // This callback async processed. Invocations are sequential.
        onChange: async (change) => {
          await database.writeLock(async (tx) => {
            // API exposes a context to run things here.
            // using execute seems to be important on Node.js
            // the temp table is not present if using getAll
            const changes = await tx.execute(/* sql */ `
              SELECT
                *
              FROM
                ${tempTable}
            `);

            results.push(...(changes.rows?._array || []));

            // Clear the temp table after processing
            await tx.execute(/* sql */ ` DELETE FROM ${tempTable}; `);
          });
        }
      },
      { tables: [tempTable] }
    );

    // Do some changes to the source table
    await database.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?);', ['test list']);
    await database.execute(`UPDATE lists SET name = 'wooo'`);

    // Wait for the changes to be processed and results to be collected
    await vi.waitFor(
      () => {
        expect(results.length).toEqual(2);
        expect(results[0].operation).toEqual('INSERT');
        expect(results[1].operation).toEqual('UPDATE');
      },
      { timeout: 1000 }
    );
  });

  /**
   * Uses the automatic handlers for triggers to track changes.
   */
  databaseTest('Should be able to handle table changes', { timeout: 100_000 }, async ({ database }) => {
    await database.execute(
      /* sql */ `
        INSERT INTO
          lists (id, name)
        VALUES
          (uuid (), ?),
          (uuid (), ?) RETURNING *
      `,
      ['test list 1', 'test list 2']
    );

    const [firstList, secondList] = await database.getAll<Database['lists']>(/* sql */ `
      SELECT
        *
      FROM
        lists
    `);

    const results: Database['todos'][] = [];

    /**
     * Watch the todos table for changes. Only track the diff for rows belonging to the first list.
     */
    await database.triggers.trackTableDiff({
      source: 'todos',
      columns: ['list_id'],
      // TODO, should/could we expose columns without json. Maybe with a temp view
      filter: `json_extract(NEW.data, '$.list_id') = '${firstList.id}'`,
      operations: [DiffTriggerOperation.INSERT],
      onChange: async (context) => {
        // Fetches the todo records that were inserted during this diff
        const newTodos = await context.getAll<Database['todos']>(/* sql */ `
          SELECT
            todos.*
          FROM
            diff
            JOIN todos ON diff.id = todos.id
        `);

        results.push(...newTodos);
      }
    });

    // Create todos for both lists
    await database.execute(
      /* sql */ `
        INSERT INTO
          todos (id, content, list_id)
        VALUES
          (uuid (), 'todo 1', ?),
          (uuid (), 'todo 2', ?);
      `,
      [firstList.id, secondList.id]
    );

    // Wait for the changes to be processed and results to be collected
    // We should only get a result for the first list.
    await vi.waitFor(
      () => {
        expect(results.length).toEqual(1);
      },
      { timeout: 10000 }
    );

    // Do further inserts
    // Create todos for both lists
    await database.execute(
      /* sql */ `
        INSERT INTO
          todos (id, content, list_id)
        VALUES
          (uuid (), 'todo 1', ?),
          (uuid (), 'todo 2', ?);
      `,
      [firstList.id, secondList.id]
    );

    await vi.waitFor(
      () => {
        expect(results.length).toEqual(2);
      },
      { timeout: 10000 }
    );
  });

  /**
   * Allows syncing the current state of the database with a lock context.
   */
  databaseTest('Should accept a lock context', { timeout: 100_000 }, async ({ database }) => {
    await database.execute(
      /* sql */ `
        INSERT INTO
          lists (id, name)
        VALUES
          (uuid (), ?),
          (uuid (), ?) RETURNING *
      `,
      ['test list 1', 'test list 2']
    );

    const [firstList, secondList] = await database.getAll<Database['lists']>(/* sql */ `
      SELECT
        *
      FROM
        lists
    `);

    const todos: Database['todos'][] = [];

    const createTodo = async () => {
      // Create todos for both lists
      await database.writeLock(async (tx) => {
        await tx.execute(
          /* sql */ `
            INSERT INTO
              todos (id, content, list_id)
            VALUES
              (uuid (), 'todo', ?)
          `,
          [firstList.id]
        );
      });
    };

    const setupWatch = () =>
      // Configure the trigger to watch for changes.
      // The onChange handler is guaranteed to see any change after the state above.
      database.triggers.trackTableDiff({
        source: 'todos',
        columns: ['list_id'],
        // TODO, should/could we expose columns without json. Maybe with a temp view
        filter: `json_extract(NEW.data, '$.list_id') = '${firstList.id}'`,
        operations: [DiffTriggerOperation.INSERT],
        onChange: async (context) => {
          // Fetches the todo records that were inserted during this diff
          const newTodos = await context.getAll<Database['todos']>(/* sql */ `
            SELECT
              todos.*
            FROM
              DIFF
              JOIN todos ON DIFF.id = todos.id
          `);
          todos.push(...newTodos);
        },
        hooks: {
          beforeCreate: async (lockContext) => {
            // This hook is executed inside the write lock before the trigger is created.
            // It can be used to synchronize the current state and fetch all changes after the current state.
            // Read the current state of the todos table
            const currentTodos = await lockContext.getAll<Database['todos']>(
              /* sql */ `
                SELECT
                  *
                FROM
                  todos
                WHERE
                  list_id = ?
              `,
              [firstList.id]
            );

            // Example code could process the current todos if necessary
            todos.push(...currentTodos);
          }
        }
      });

    // Trigger the operations in a random order;
    const todoCreationCount = 10;
    const promises = [
      ...Array(5).fill(0).map(createTodo),
      setupWatch(),
      ...Array(todoCreationCount - 5)
        .fill(0)
        .map(createTodo)
    ];

    // Wait for the changes to be processed and results to be collected
    // We should have recorded all the todos which are present
    await vi.waitFor(
      async () => {
        expect(todos.length).toEqual(todoCreationCount);
      },
      { timeout: 10000, interval: 1000 }
    );
  });
});
