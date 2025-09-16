import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ReadableStream, TransformStream } from 'node:stream/web';

import { onTestFinished, test } from 'vitest';
import {
  AbstractPowerSyncDatabase,
  BucketChecksum,
  column,
  NodePowerSyncDatabaseOptions,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
  PowerSyncDatabase,
  Schema,
  StreamingSyncCheckpoint,
  StreamingSyncLine,
  SyncStatus,
  Table
} from '../lib';
import { createLogger } from '@powersync/common';
import Logger from 'js-logger';

export async function createTempDir() {
  const ostmpdir = os.tmpdir();
  const tmpdir = path.join(ostmpdir, 'powersync-node-test-');
  return await fs.mkdtemp(tmpdir);
}

export const LIST_TABLE = 'lists';
export const TODO_TABLE = 'todos';

const lists = new Table({
  name: column.text
});

const todos = new Table({
  content: column.text,
  list_id: column.text
});

export const AppSchema = new Schema({
  lists,
  todos
});

export type Database = (typeof AppSchema)['types'];

export const tempDirectoryTest = test.extend<{ tmpdir: string }>({
  tmpdir: async ({}, use) => {
    const directory = await createTempDir();
    await use(directory);
    await fs.rm(directory, { recursive: true });
  }
});

export async function createDatabase(
  tmpdir: string,
  options: Partial<NodePowerSyncDatabaseOptions> = {}
): Promise<PowerSyncDatabase> {
  const defaultLogger = createLogger('PowerSyncTest', { logLevel: Logger.TRACE });
  (defaultLogger as any).invoke = (_, args) => {
    console.log(...args);
  };

  const database = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: 'test.db',
      dbLocation: tmpdir,
      readWorkerCount: 1
    },
    logger: defaultLogger,
    ...options
  });
  await database.init();
  return database;
}

export const databaseTest = tempDirectoryTest.extend<{ database: PowerSyncDatabase }>({
  database: async ({ tmpdir }, use) => {
    const db = await createDatabase(tmpdir);
    await use(db);
    await db.close();
  }
});

// TODO: Unify this with the test setup for the web SDK.
export const mockSyncServiceTest = tempDirectoryTest.extend<{
  syncService: MockSyncService;
}>({
  syncService: async ({ tmpdir }, use) => {
    interface Listener {
      request: any;
      stream: ReadableStreamDefaultController<StreamingSyncLine>;
    }

    const listeners: Listener[] = [];

    const inMemoryFetch: typeof fetch = async (info, init?) => {
      const request = new Request(info, init);
      if (request.url.endsWith('/sync/stream')) {
        const body = await request.json();
        let listener: Listener | null = null;

        const syncLines = new ReadableStream<StreamingSyncLine>({
          start(controller) {
            listener = {
              request: body,
              stream: controller
            };

            listeners.push(listener);
          },
          cancel() {
            listeners.splice(listeners.indexOf(listener!), 1);
          }
        });

        const encoder = new TextEncoder();
        const asLines = new TransformStream<StreamingSyncLine, Uint8Array>({
          transform: (chunk, controller) => {
            const line = `${JSON.stringify(chunk)}\n`;
            controller.enqueue(encoder.encode(line));
          }
        });

        return new Response(syncLines.pipeThrough(asLines) as any, { status: 200 });
      } else if (request.url.indexOf('/write-checkpoint2.json') != -1) {
        return new Response(
          JSON.stringify({
            data: { write_checkpoint: '1' }
          }),
          { status: 200 }
        );
      } else {
        return new Response('Not found', { status: 404 });
      }
    };

    const newConnection = async (options?: Partial<NodePowerSyncDatabaseOptions>) => {
      const db = await createDatabase(tmpdir, {
        ...options,
        remoteOptions: {
          fetchImplementation: inMemoryFetch
        }
      });

      onTestFinished(async () => await db.close());
      return db;
    };

    await use({
      get connectedListeners() {
        return listeners.map((e) => e.request);
      },
      pushLine(line) {
        for (const listener of listeners) {
          listener.stream.enqueue(line);
        }
      },
      createDatabase: newConnection
    });
  }
});

export interface MockSyncService {
  pushLine: (line: StreamingSyncLine) => void;
  connectedListeners: any[];
  createDatabase: (options?: Partial<NodePowerSyncDatabaseOptions>) => Promise<PowerSyncDatabase>;
}

export class TestConnector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    return {
      endpoint: 'https://powersync.example.org',
      token: 'test'
    };
  }
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const tx = await database.getNextCrudTransaction();
    await tx?.complete();
  }
}

export function waitForSyncStatus(
  database: AbstractPowerSyncDatabase,
  matcher: (status: SyncStatus) => boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (matcher(database.currentStatus)) {
      return resolve();
    }

    const dispose = database.registerListener({
      statusChanged: (status) => {
        try {
          if (matcher(status)) {
            dispose();
            resolve();
          }
        } catch (e) {
          reject(e);
          dispose();
        }
      }
    });
  });
}

export function checkpoint(options: { last_op_id: number; buckets?: any[]; streams?: any[] }): StreamingSyncCheckpoint {
  return {
    checkpoint: {
      last_op_id: `${options.last_op_id}`,
      buckets: options.buckets ?? [],
      write_checkpoint: null,
      streams: options.streams ?? []
    }
  };
}

export function bucket(
  name: string,
  count: number,
  options: { priority: number; subscriptions?: any } = { priority: 3 }
): BucketChecksum {
  return {
    bucket: name,
    count,
    checksum: 0,
    priority: options.priority,
    subscriptions: options.subscriptions
  };
}

export function stream(name: string, isDefault: boolean, errors = []) {
  return { name, is_default: isDefault, errors };
}

export function nextStatus(db: PowerSyncDatabase): Promise<SyncStatus> {
  return new Promise((resolve) => {
    let l;

    l = db.registerListener({
      statusChanged(status) {
        resolve(status);
        l();
      }
    });
  });
}
