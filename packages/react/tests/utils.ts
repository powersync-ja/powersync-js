import * as commonSdk from '@powersync/common';

import { PowerSyncDatabase } from '@powersync/node';
import { Worker } from 'node:worker_threads';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { onTestFinished } from 'vitest';

export async function createTempDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'powersync-react-test-'));
}

// Vitest's jsdom environment loads @powersync/node through its SSR module runner rather than
// native `import()`, which breaks loading the default worker. Resolving from package.json avoids that.
const requireFromReact = createRequire(path.join(process.cwd(), 'package.json'));
const powersyncNodePackageDir = path.dirname(requireFromReact.resolve('@powersync/node/package.json'));
const defaultWorkerUrl = pathToFileURL(path.join(powersyncNodePackageDir, 'lib', 'db', 'DefaultWorker.js'));

export async function createDatabase(schema: commonSdk.Schema) {
  const tmpdir = await createTempDir();

  const db = new PowerSyncDatabase({
    database: {
      dbFilename: 'test.db',
      dbLocation: tmpdir,
      openWorker: (_url, options) => new Worker(defaultWorkerUrl, options)
    },
    schema
  });
  await db.init();

  onTestFinished(async () => {
    await db.disconnectAndClear();
    await db.close();
    await fs.rm(tmpdir, { recursive: true });
  });

  return db;
}

export const openPowerSync = () =>
  createDatabase(
    new commonSdk.Schema({
      lists: new commonSdk.Table({
        name: commonSdk.column.text
      })
    })
  );
