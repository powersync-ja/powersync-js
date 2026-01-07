import { DiffTriggerOperation } from '@powersync/common';
import { WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { TEST_SCHEMA } from './utils/test-schema';
import { generateTestDb } from './utils/testDb';

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

  it('should cleanup persisted trigger tables when opening a new client', { timeout: Infinity }, async () => {
    debugger;
    /**
     * Creates a simple iFrame which loads a script which creates a managed trigger.
     */
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

  it('should remember table state after disconnectAndClear', async () => {
    const db = generateTestDb({
      database: new WASQLiteOpenFactory({
        dbFilename: 'triggers.sqlite',
        vfs: WASQLiteVFS.OPFSCoopSyncVFS
      }),
      schema: TEST_SCHEMA
    });

    await db.triggers.createDiffTrigger({
      source: TEST_SCHEMA.props.customers.name,
      destination: 'xxxx_test_1',
      when: {
        [DiffTriggerOperation.INSERT]: 'TRUE'
      }
    });

    await db.disconnectAndClear();

    const state = await db.get<{ value: string }>('SELECT value FROM ps_kv WHERE key = ?', [
      'powersync_tables_to_cleanup'
    ]);
    expect(state).toBeDefined();
    expect(state?.value).toBeDefined();
    expect(JSON.parse(state?.value ?? '[]').length).eq(1);
  });
});
