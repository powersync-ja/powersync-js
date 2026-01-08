import {
  column,
  DiffTriggerOperation,
  ExtractedTriggerDiffRecord,
  sanitizeSQL,
  sanitizeUUID,
  Schema,
  Table,
  TriggerDiffRecord
} from '@powersync/common';
import { describe, expect, vi } from 'vitest';
import { Database, databaseTest } from './utils';

describe('Triggers', () => {
  /**
   * Tests a diff trigger for a table.
   * The triggered results are watched manually.
   */
  databaseTest('Diff triggers should track table changes', async ({ database }) => {
    const tempTable = 'temp_remote_lists';

    const filteredColumns: Array<keyof Database['todos']> = ['content'];
    await database.triggers.createDiffTrigger({
      source: 'todos',
      destination: tempTable,
      columns: filteredColumns,
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE',
        [DiffTriggerOperation.UPDATE]: 'TRUE',
        [DiffTriggerOperation.DELETE]: 'TRUE'
      }
    });

    const results = [] as TriggerDiffRecord[];

    database.onChange(
      {
        // This callback async processed. Invocations are sequential.
        onChange: async () => {
          await database.writeLock(async (tx) => {
            const changes = await tx.getAll<TriggerDiffRecord>(/* sql */ `
              SELECT
                *
              FROM
                ${tempTable}
            `);
            results.push(...changes);
            // Clear the temp table after processing
            await tx.execute(/* sql */ ` DELETE FROM ${tempTable}; `);
          });
        }
      },
      { tables: [tempTable] }
    );

    // Do some changes to the source table
    const initialContent = 'test todo';
    await database.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?);', [initialContent]);
    await database.execute(`UPDATE todos SET content = 'wooo'`);
    const updatedContent = 'wooo';
    await database.execute('DELETE FROM todos WHERE content = ?', [updatedContent]);

    // Wait for the changes to be processed and results to be collected
    await vi.waitFor(
      () => {
        expect(results.length).toEqual(3);

        // Check that operation_id values exist and are numbers
        expect(results[0].operation_id).toBeDefined();
        expect(typeof results[0].operation_id).toBe('number');
        expect(results[0].operation_id).eq(1);
        expect(results[1].operation_id).toBeDefined();
        expect(results[1].operation_id).eq(2);

        expect(results[0].operation).toEqual(DiffTriggerOperation.INSERT);
        const parsedInsert = JSON.parse(results[0].value);
        // only the filtered columns should be tracked
        expect(Object.keys(parsedInsert)).deep.eq(filteredColumns);
        expect(parsedInsert.content).eq(initialContent);

        const updateRaw = results[1];
        expect(updateRaw).toBeDefined();
        expect(updateRaw.operation).toEqual(DiffTriggerOperation.UPDATE);
        if (updateRaw.operation == DiffTriggerOperation.UPDATE) {
          // The `if` just exposes the type correctly
          expect(JSON.parse(updateRaw.value).content).eq(updatedContent);
          expect(JSON.parse(updateRaw.previous_value).content).eq(initialContent);
        }

        expect(results[2].operation).toEqual(DiffTriggerOperation.DELETE);
        expect(JSON.parse(results[2].value).content).eq(updatedContent);
      },
      { timeout: 1000 }
    );
  });

  /**
   * Uses the automatic handlers for triggers to track changes.
   */
  databaseTest('Should be able to track table inserts', async ({ database }) => {
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
      when: {
        [DiffTriggerOperation.INSERT]: sanitizeSQL`json_extract(NEW.data, '$.list_id') = ${sanitizeUUID(firstList.id)}`
      },
      onChange: async (context) => {
        // Fetches the current state of  todo records that were inserted during this diff window.
        const newTodos = await context.withDiff<Database['todos']>(/* sql */ `
          SELECT
            todos.*
          FROM
            DIFF
            JOIN todos ON DIFF.id = todos.id
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
      { timeout: 1000 }
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
      { timeout: 1000 }
    );
  });

  databaseTest('Should be able to track table updates', async ({ database }) => {
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

    const changes: ExtractedTriggerDiffRecord<Database['lists']>[] = [];

    /**
     * Watch the todos table for changes. Only track the diff for rows belonging to the first list.
     */
    await database.triggers.trackTableDiff({
      source: 'lists',
      when: {
        [DiffTriggerOperation.UPDATE]: sanitizeSQL`NEW.id = ${sanitizeUUID(list.id)}`,
        [DiffTriggerOperation.DELETE]: 'TRUE'
      },
      onChange: async (context) => {
        // Fetches the todo records that were inserted during this diff
        const diffs = await context.withExtractedDiff<ExtractedTriggerDiffRecord<Database['lists']>>(/* sql */ `
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
      { timeout: 1000 }
    );

    // clear the items
    await database.execute(
      /* sql */ `
        DELETE FROM lists
        WHERE
          id = ?
      `,
      [list.id]
    );

    await vi.waitFor(
      () => {
        expect(changes.length).toEqual(updateCount + 1);
        expect(changes[changes.length - 1].__operation).eq(DiffTriggerOperation.DELETE);
        // The delete diff should contain the previous value
        expect(changes[changes.length - 1].name).eq(`updated ${updateCount - 1}`);
      },
      { timeout: 1000 }
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
      when: {
        [DiffTriggerOperation.INSERT]: sanitizeSQL`json_extract(NEW.data, '$.list_id') = ${sanitizeUUID(firstList.id)}`
      },
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
      { timeout: 1000, interval: 100 }
    );
  });

  databaseTest('Should extract diff values', async ({ database }) => {
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
      when: {
        [DiffTriggerOperation.INSERT]: sanitizeSQL`json_extract(NEW.data, '$.list_id') = ${sanitizeUUID(firstList.id)}`
      },
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
      { timeout: 1000, interval: 100 }
    );
  });

  databaseTest('Should allow tracking 0 columns', async ({ database }) => {
    /**
     * Tracks the ids of todos reported via the trigger
     */
    const changes: string[] = [];

    /**
     * Tracks the ids of todos created
     */
    const ids: string[] = [];
    const createTodo = async (content: string) => {
      // Create todos for both lists
      return database.writeLock(async (tx) => {
        const result = await tx.execute(
          /* sql */ `
            INSERT INTO
              todos (id, content)
            VALUES
              (uuid (), ?) RETURNING id
          `,
          [content]
        );
        return result.rows?._array?.[0].id;
      });
    };

    await database.triggers.trackTableDiff({
      source: 'todos',
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE',
        [DiffTriggerOperation.UPDATE]: 'TRUE',
        [DiffTriggerOperation.DELETE]: 'TRUE'
      },
      // Only track the row ids
      columns: [],
      onChange: async (context) => {
        // Fetches the content of the records at the time of the operation
        const extractedDiff = await context.withExtractedDiff<{ id: string }>(/* sql */ `
          SELECT
            *
          FROM
            DIFF
        `);
        changes.push(...extractedDiff.map((d) => d.id));
      }
    });

    ids.push(await createTodo('todo 1'));
    ids.push(await createTodo('todo 2'));
    const updatedId = await createTodo('todo 3');
    ids.push(updatedId);

    await database.execute(/* sql */ `
      UPDATE todos
      SET
        content = 'todo 4'
      WHERE
        content = 'todo 3'
    `);
    // keep track of updates for comparison
    ids.push(updatedId);

    await database.execute(/* sql */ `
      DELETE FROM todos
      WHERE
        content = 'todo 4'
    `);
    ids.push(updatedId);

    // Wait for the changes to be processed and results to be collected
    // We should have recorded all the todos which are present
    await vi.waitFor(
      async () => {
        expect(changes).toEqual(ids);
      },
      { timeout: 1000, interval: 100 }
    );
  });

  databaseTest('Should only track listed columns', async ({ database }) => {
    const newSchema = new Schema({
      todos: new Table({
        content: column.text,
        columnA: column.text,
        columnB: column.text
      })
    });
    await database.updateSchema(newSchema);

    type NewTodoRecord = (typeof newSchema)['types']['todos'];

    const changes: ExtractedTriggerDiffRecord<NewTodoRecord>[] = [];

    const createTodo = async (content: string, columnA = 'A', columnB = 'B'): Promise<NewTodoRecord> => {
      // Create todos for both lists
      return database.writeLock(async (tx) => {
        const result = await tx.execute(
          /* sql */ `
            INSERT INTO
              todos (id, content, columnA, columnB)
            VALUES
              (uuid (), ?, ?, ?) RETURNING id
          `,
          [content, columnA, columnB]
        );
        return result.rows?._array?.[0];
      });
    };

    await database.triggers.trackTableDiff({
      source: 'todos',
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE',
        [DiffTriggerOperation.UPDATE]: 'TRUE',
        [DiffTriggerOperation.DELETE]: 'TRUE'
      },
      columns: ['columnA'],
      onChange: async (context) => {
        // Fetches the content of the records at the time of the operation
        const extractedDiff = await context.withExtractedDiff<ExtractedTriggerDiffRecord<NewTodoRecord>>(/* sql */ `
          SELECT
            *
          FROM
            DIFF
        `);
        changes.push(...extractedDiff);
      }
    });

    await createTodo('todo 1');
    await createTodo('todo 2');
    await createTodo('todo 3');

    // Do an update operation to ensure only the tracked columns of updated values are stored
    await database.execute(/* sql */ `
      UPDATE todos
      SET
        content = 'todo 4'
      WHERE
        content = 'todo 3'
    `);

    // Do a delete operation to ensure only the tracked columns of updated values are stored
    await database.execute(/* sql */ `
      DELETE FROM todos
      WHERE
        content = 'todo 4'
    `);

    // Wait for all the changes to be recorded
    await vi.waitFor(
      async () => {
        expect(changes.length).toEqual(5);
      },
      { timeout: 1000, interval: 100 }
    );

    // Inserts should only have the tracked columns
    expect(changes[0].__operation).eq(DiffTriggerOperation.INSERT);
    expect(changes[1].__operation).eq(DiffTriggerOperation.INSERT);
    expect(changes[2].__operation).eq(DiffTriggerOperation.INSERT);
    // Should not track this column
    expect(changes[0].columnB).toBeUndefined();

    expect(changes[3].__operation).eq(DiffTriggerOperation.UPDATE);
    expect(changes[3].columnB).toBeUndefined();
    expect(changes[3].__previous_value).toBeDefined();
    expect(Object.keys(JSON.parse(changes[3].__previous_value))).to.deep.equal(['columnA']);

    // For deletes we extract the old value for convenience (there is no new value)
    expect(changes[4].__operation).eq(DiffTriggerOperation.DELETE);
    expect(changes[4].columnB).toBeUndefined();
    expect(changes[4].__previous_value).toBeNull();
  });

  databaseTest('Should cast operation_id as string with withDiff option', async ({ database }) => {
    const results: TriggerDiffRecord<string>[] = [];

    await database.triggers.trackTableDiff({
      source: 'todos',
      columns: ['content'],
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE'
      },
      onChange: async (context) => {
        const diffs = await context.withDiff<TriggerDiffRecord<string>>('SELECT * FROM DIFF', undefined, {
          castOperationIdAsText: true
        });
        results.push(...diffs);
      }
    });

    await database.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?);', ['test 1']);
    await database.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?);', ['test 2']);

    await vi.waitFor(
      () => {
        expect(results.length).toEqual(2);
        // Check that operation_id is a string when castOperationIdAsText is enabled
        expect(typeof results[0].operation_id).toBe('string');
        expect(typeof results[1].operation_id).toBe('string');
        // Should be incrementing
        expect(Number.parseInt(results[0].operation_id)).toBeLessThan(Number.parseInt(results[1].operation_id));
      },
      { timeout: 1000 }
    );
  });

  databaseTest('Should report changes in transaction order using operation_id', async ({ database }) => {
    const results: TriggerDiffRecord[] = [];

    await database.triggers.trackTableDiff({
      source: 'todos',
      columns: ['content'],
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE',
        [DiffTriggerOperation.UPDATE]: 'TRUE',
        [DiffTriggerOperation.DELETE]: 'TRUE'
      },
      onChange: async (context) => {
        const diffs = await context.withDiff<TriggerDiffRecord>('SELECT * FROM DIFF');
        results.push(...diffs);
      }
    });

    // Perform multiple operations in a single transaction
    const contents = ['first', 'second', 'third', 'fourth'];
    await database.writeLock(async (tx) => {
      // Insert first todo
      await tx.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?);', [contents[0]]);
      // Insert second todo
      await tx.execute('INSERT INTO todos (id, content) VALUES (uuid(), ?);', [contents[1]]);
      // Update first todo
      await tx.execute('UPDATE todos SET content = ? WHERE content = ?;', [contents[2], contents[0]]);
      // Delete second todo
      await tx.execute('DELETE FROM todos WHERE content = ?;', [contents[1]]);
    });

    await vi.waitFor(
      () => {
        expect(results.length).toEqual(4);

        // Verify operation_ids are incrementing (ensuring order)
        expect(results[0].operation_id).toBeLessThan(results[1].operation_id);
        expect(results[1].operation_id).toBeLessThan(results[2].operation_id);
        expect(results[2].operation_id).toBeLessThan(results[3].operation_id);

        // Verify operations are in the correct order
        expect(results[0].operation).toBe(DiffTriggerOperation.INSERT);
        expect(JSON.parse(results[0].value).content).toBe(contents[0]);

        expect(results[1].operation).toBe(DiffTriggerOperation.INSERT);
        expect(JSON.parse(results[1].value).content).toBe(contents[1]);

        expect(results[2].operation).toBe(DiffTriggerOperation.UPDATE);
        if (results[2].operation === DiffTriggerOperation.UPDATE) {
          expect(JSON.parse(results[2].value).content).toBe(contents[2]);
          expect(JSON.parse(results[2].previous_value).content).toBe(contents[0]);
        }

        expect(results[3].operation).toBe(DiffTriggerOperation.DELETE);
        expect(JSON.parse(results[3].value).content).toBe(contents[1]);
      },
      { timeout: 1000 }
    );
  });

  databaseTest('Should use persisted tables and triggers', async ({ database }) => {
    const table = 'temp_remote_lists';

    const filteredColumns: Array<keyof Database['todos']> = ['content'];
    const cleanup = await database.triggers.createDiffTrigger({
      source: 'todos',
      destination: table,
      columns: filteredColumns,
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE',
        [DiffTriggerOperation.UPDATE]: 'TRUE',
        [DiffTriggerOperation.DELETE]: 'TRUE'
      },
      useStorage: true
    });

    const results = [] as TriggerDiffRecord[];

    database.onChange(
      {
        // This callback async processed. Invocations are sequential.
        onChange: async () => {
          await database.writeLock(async (tx) => {
            const changes = await tx.getAll<TriggerDiffRecord>(/* sql */ `
              SELECT
                *
              FROM
                ${table}
            `);
            results.push(...changes);
            // Clear the temp table after processing
            await tx.execute(/* sql */ ` DELETE FROM ${table}; `);
          });
        }
      },
      { tables: [table] }
    );

    // The destination table should not be temporary, it should be present in sqlite_master
    const initialTableRows = await database.getAll<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
      [table]
    );
    expect(initialTableRows.length).toEqual(1);

    await database.execute(`INSERT INTO todos (id, content) VALUES (uuid(), 'hello');`);

    // Smoke test that the trigger worked with persistence
    await vi.waitFor(() => {
      expect(results.length).toEqual(1);
    });

    // perform a manual cleanup
    await cleanup();

    // For sanity, the table should not exist
    const tableRows = await database.getAll<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
      [table]
    );
    expect(tableRows.length).toEqual(0);
  });
});
