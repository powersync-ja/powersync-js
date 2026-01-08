import { DiffTriggerOperation } from '@powersync/common';
import { WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { TEST_SCHEMA } from './utils/test-schema';
import { generateTestDb } from './utils/testDb';

// Shared helper to spin up an iframe that creates a persisted trigger table
const createTriggerInIframe = () => {
  const testFileUrl = new URL(import.meta.url);
  const testFileDir = testFileUrl.pathname.substring(0, testFileUrl.pathname.lastIndexOf('/'));
  // Construct the absolute path to the initializer module relative to the test file
  const modulePath = `${testFileUrl.origin}${testFileDir}/utils/triggers/IFrameTriggerConfig.ts`;

  const htmlContent = /* html */ `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>PowerSync Trigger Client</title>
      </head>
      <body>
        <script type="module">
          // This will create the trigger
          import '${modulePath}';
        </script>
      </body>
    </html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.src = url;
  document.body.appendChild(iframe);
  return iframe;
};

describe('Triggers', () => {
  it('should automatically configure persistence for OPFS triggers', async () => {
    const db = generateTestDb({
      database: new WASQLiteOpenFactory({
        dbFilename: 'triggers.sqlite',
        vfs: WASQLiteVFS.OPFSCoopSyncVFS
      }),
      schema: TEST_SCHEMA
    });

    let _destinationName: string | null = null;

    const disposeTrigger = await db.triggers.trackTableDiff({
      source: TEST_SCHEMA.props.customers.name,
      onChange: async (ctx) => {
        _destinationName = ctx.destinationTable;
      },
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE'
      }
    });

    onTestFinished(disposeTrigger);

    await db.execute("INSERT INTO customers (id, name) VALUES (uuid(), 'test')");

    await vi.waitFor(() => {
      expect(_destinationName).toBeTruthy();
    });

    const destinationName = _destinationName!;

    // the table should exist in `sqlite_master` since it's persisted
    const initialTableRows = await db.getAll<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`,
      [destinationName]
    );

    expect(initialTableRows.length).toEqual(1);
  });

  it('should cleanup persisted trigger tables when opening a new client', async () => {
    debugger;

    const openDB = () =>
      generateTestDb({
        database: new WASQLiteOpenFactory({
          dbFilename: 'triggers.sqlite',
          vfs: WASQLiteVFS.OPFSCoopSyncVFS
        }),
        schema: TEST_SCHEMA
      });

    // An initial db for monitoring the iframes and SQLite resources
    const db = openDB();

    // allow the initial open to cleanup any previous resource from previous test runs
    await vi.waitFor(
      async () => {
        const tables = await db.getAll<{ namce: string }>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'xxxx_test%'`
        );
        expect(tables.length).eq(0);
      },
      { interval: 100 }
    );

    const firstTriggerIFrame = createTriggerInIframe();
    onTestFinished(() => firstTriggerIFrame.remove());

    // poll for the table to exist
    await vi.waitFor(
      async () => {
        const tables = await db.getAll<{ name: string }>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'xxxx_test%'`
        );
        expect(tables.length).eq(1);
      },
      { interval: 100 }
    );

    const secondIFrameClient = createTriggerInIframe();
    onTestFinished(() => secondIFrameClient.remove());

    await vi.waitFor(
      async () => {
        const tables = await db.getAll<{ name: string }>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'xxxx_test%'`
        );
        expect(tables.length).eq(2);
      },
      { interval: 100 }
    );

    // close the first Iframe, releasing holds
    firstTriggerIFrame.remove();

    // This should clear the first resource when the new client is opened
    const refreshClient = openDB();

    await vi.waitFor(
      async () => {
        const tables = await db.getAll<{ name: string }>(
          `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'xxxx_test%'`
        );
        expect(tables.length).eq(1);
      },
      { interval: 100 }
    );
  });

  it('should report diff operations across clients (insert from client B observed by client A)', async () => {
    const openDB = (filename: string) =>
      generateTestDb({
        database: new WASQLiteOpenFactory({
          dbFilename: filename,
          vfs: WASQLiteVFS.OPFSCoopSyncVFS
        }),
        schema: TEST_SCHEMA
      });

    const filename = 'triggers-multi.sqlite';

    const dbA = openDB(filename);
    const dbB = openDB(filename);

    const observed: Array<{ id: string; op: string }> = [];

    const disposeTrigger = await dbA.triggers.trackTableDiff({
      source: TEST_SCHEMA.props.customers.name,
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE'
      },
      onChange: async (ctx) => {
        const rows = await ctx.withExtractedDiff<{ id: string; __operation: string }>(
          'SELECT id, __operation FROM DIFF',
          []
        );
        for (const r of rows) observed.push({ id: r.id, op: r.__operation });
      }
    });

    onTestFinished(disposeTrigger);

    // Perform an insert from client B
    await dbB.execute("INSERT INTO customers (id, name) VALUES (uuid(), 'from-client-b')");

    // Client A should observe the diff generated by the trigger
    await vi.waitFor(() => {
      expect(observed.some((r) => r.op === 'INSERT')).toBe(true);
    });
  });
});
