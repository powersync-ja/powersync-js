import { DiffTriggerOperation, TriggerDiffRecord } from '@powersync/common';
// import 'source-map-support/register';
import { describe, expect, vi } from 'vitest';
import { Database, databaseTest } from './utils';

describe('Triggers', () => {
  /**
   * Tests a diff trigger for a table.
   * The triggered results are watched manually.
   */
  databaseTest('Diff triggers should track table changes', async ({ database }) => {
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
  databaseTest('Should be able to handle table inserts', async ({ database }) => {
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
      when: { [DiffTriggerOperation.INSERT]: `json_extract(NEW.data, '$.list_id') = '${firstList.id}'` },
      operations: [DiffTriggerOperation.INSERT],
      onChange: async (context) => {
        // Fetches the todo records that were inserted during this diff
        const newTodos = await context.withDiff<Database['todos']>(/* sql */ `
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

  databaseTest('Should be able to handle table updates', async ({ database }) => {
    const { rows } = await database.execute(
      /* sql */ `
        INSERT INTO
          lists (id, name)
        VALUES
          (uuid (), ?) RETURNING *
      `,
      ['test list 1']
    );

    const list = rows!.item(0) as Database['lists'];

    const changes: Database['lists'][] = [];

    /**
     * Watch the todos table for changes. Only track the diff for rows belonging to the first list.
     */
    await database.triggers.trackTableDiff({
      source: 'lists',
      when: { [DiffTriggerOperation.INSERT]: `NEW.id = '${list.id}'` },
      operations: [DiffTriggerOperation.UPDATE],
      onChange: async (context) => {
        // Fetches the todo records that were inserted during this diff
        const diffs = await context.withExtractedDiff<Database['lists']>(/* sql */ `
          SELECT
            *
          FROM
            DIFF
        `);

        changes.push(...diffs);
      }
    });

    const updateCount = 10;
    for (let i = 0; i < updateCount; i++) {
      // Create todos for both lists
      await database.execute(
        /* sql */ `
          UPDATE lists
          set
            name = 'updated ${i}'
          WHERE
            id = ?;
        `,
        [list.id]
      );
    }

    await vi.waitFor(
      () => {
        expect(changes.length).toEqual(updateCount);
        expect(changes.map((c) => c.name)).toEqual(Array.from({ length: updateCount }, (_, i) => `updated ${i}`));
      },
      { timeout: 10000 }
    );
  });

  /**
   * Allows syncing the current state of the database with a lock context.
   */
  databaseTest('Should accept hooks', async ({ database }) => {
    await database.execute(
      /* sql */ `
        INSERT INTO
          lists (id, name)
        VALUES
          (uuid (), ?),
          (uuid (), ?)
      `,
      ['test list 1', 'test list 2']
    );

    const [firstList] = await database.getAll<Database['lists']>(/* sql */ `
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

    // Trigger the operations in a random order;
    const todoCreationCount = 100;
    const initialTodoCreationCount = 10;

    await Promise.all(Array.from({ length: initialTodoCreationCount }).map(createTodo));

    // Configure the trigger to watch for changes.
    // The onChange handler is guaranteed to see any change after the state above.
    await database.triggers.trackTableDiff({
      source: 'todos',
      columns: ['list_id'],
      when: { [DiffTriggerOperation.INSERT]: `json_extract(NEW.data, '$.list_id') = '${firstList.id}'` },
      operations: [DiffTriggerOperation.INSERT],
      onChange: async (context) => {
        // Fetches the todo records that were inserted during this diff
        const newTodos = await context.withDiff<Database['todos']>(/* sql */ `
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

    await Promise.all(Array.from({ length: todoCreationCount - initialTodoCreationCount }).map(createTodo));

    // Wait for the changes to be processed and results to be collected
    // We should have recorded all the todos which are present
    await vi.waitFor(
      async () => {
        expect(todos.length).toEqual(todoCreationCount);
      },
      { timeout: 10000, interval: 1000 }
    );
  });

  databaseTest('Should extract diff values', { timeout: 10000 }, async ({ database }) => {
    await database.execute(
      /* sql */ `
        INSERT INTO
          lists (id, name)
        VALUES
          (uuid (), ?),
          (uuid (), ?)
      `,
      ['test list 1', 'test list 2']
    );

    const [firstList] = await database.getAll<Database['lists']>(/* sql */ `
      SELECT
        *
      FROM
        lists
    `);

    const changes: Array<{ content: string; operation: DiffTriggerOperation }> = [];

    const createTodo = async (content: string) => {
      // Create todos for both lists
      await database.writeLock(async (tx) => {
        await tx.execute(
          /* sql */ `
            INSERT INTO
              todos (id, content, list_id)
            VALUES
              (uuid (), ?, ?)
          `,
          [content, firstList.id]
        );
      });
    };

    // Configure the trigger to watch for changes.
    // The onChange handler is guaranteed to see any change after the state above.
    await database.triggers.trackTableDiff({
      source: 'todos',
      when: { [DiffTriggerOperation.INSERT]: `json_extract(NEW.data, '$.list_id') = '${firstList.id}'` },
      operations: [DiffTriggerOperation.INSERT],
      onChange: async (context) => {
        // Fetches the content of the records at the time of the operation
        const extractedDiff = await context.withExtractedDiff<{ content: string; operation: DiffTriggerOperation }>(
          /* sql */ `
            SELECT
              -- Get the values at the time of the operation
              content,
              __operation as operation
            FROM
              DIFF
          `
        );
        changes.push(...extractedDiff);
      }
    });

    await createTodo('todo 1');
    await createTodo('todo 2');
    await createTodo('todo 3');

    // Wait for the changes to be processed and results to be collected
    // We should have recorded all the todos which are present
    await vi.waitFor(
      async () => {
        expect(changes.length).toEqual(3);
        expect(changes.map((c) => c.content)).toEqual(['todo 1', 'todo 2', 'todo 3']);
        expect(changes.every((c) => c.operation === DiffTriggerOperation.INSERT)).toBeTruthy();
      },
      { timeout: 10000, interval: 1000 }
    );
  });
});
