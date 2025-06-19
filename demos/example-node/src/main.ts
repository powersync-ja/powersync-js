import { once } from 'node:events';
import repl_factory from 'node:repl';

import {
  createBaseLogger,
  createLogger,
  PowerSyncDatabase,
  SyncClientImplementation,
  SyncStreamConnectionMethod
} from '@powersync/node';
import { exit } from 'node:process';
import { AppSchema, DemoConnector } from './powersync.js';
import { enableUncidiDiagnostics } from './UndiciDiagnostics.js';

const main = async () => {
  const baseLogger = createBaseLogger();
  const logger = createLogger('PowerSyncDemo');
  const debug = process.env.POWERSYNC_DEBUG == '1';
  baseLogger.useDefaults({ defaultLevel: debug ? logger.TRACE : logger.WARN });

  // Enable detailed request/response logging for debugging purposes.
  if (debug) {
    enableUncidiDiagnostics();
  }

  if (!('SYNC_SERVICE' in process.env)) {
    console.warn(
      'Set the BACKEND and SYNC_SERVICE environment variables to point to a sync service and a running demo backend.'
    );
    return;
  }

  const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'test.db'
    },
    logger
  });
  console.log(await db.get('SELECT powersync_rs_version();'));

  await db.connect(new DemoConnector(), {
    connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
    clientImplementation: SyncClientImplementation.RUST
  });
  // Example using a proxy agent for more control over the connection:
  // const proxyAgent = new (await import('undici')).ProxyAgent({
  //   uri: 'http://localhost:8080',
  //   requestTls: {
  //     ca: '<CA for the service>'
  //   },
  //   proxyTls: {
  //     ca: '<CA for the proxy>'
  //   }
  // });
  // await db.connect(new DemoConnector(), {
  //   connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
  //   dispatcher: proxyAgent
  // });

  await db.waitForFirstSync();
  console.log('First sync complete!');

  let hasFirstRow: ((value: any) => void) | null = null;
  const firstRow = new Promise((resolve) => (hasFirstRow = resolve));
  const watchLists = async () => {
    for await (const rows of db.watch('SELECT * FROM lists')) {
      if (hasFirstRow) {
        hasFirstRow(null);
        hasFirstRow = null;
      }
      console.log('Has todo lists', rows.rows?._array);
    }
  };

  watchLists();
  await firstRow;

  console.log('Connected to PowerSync. Try updating the lists in the database and see it reflected here.');
  console.log("To upload a list here, enter `await add('name of new list');`");

  const repl = repl_factory.start();
  repl.context.add = async (name: string) => {
    await db.execute(
      "INSERT INTO lists (id, created_at, name, owner_id) VALUEs (uuid(), datetime('now'), ?, uuid());",
      [name]
    );
  };

  await once(repl, 'exit');
  console.log('shutting down');
  await db.disconnect();
  await db.close();
  exit(0);
};

await main();
