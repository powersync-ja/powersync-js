import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { defaultFetchMockConfig, FetchMock } from 'fetch-mock';
import { test } from 'vitest';
import { AbstractPowerSyncDatabase, AbstractRemoteOptions, column, NodePowerSyncDatabaseOptions, PowerSyncBackendConnector, PowerSyncCredentials, PowerSyncDatabase, Schema, StreamingSyncLine, SyncStatus, Table } from '../lib';

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

function createDatabaseFixture(options: Partial<NodePowerSyncDatabaseOptions> = {}) {
  return async ({ tmpdir }, use) => {
    const database = new PowerSyncDatabase({
      ...options,
      schema: AppSchema,
      database: {
        dbFilename: 'test.db',
        dbLocation: tmpdir
      }
    });
    await use(database);
    await database.close();
  };
}

export const databaseTest = tempDirectoryTest.extend<{ database: PowerSyncDatabase }>({
  database: async ({tmpdir}, use) => {
    await createDatabaseFixture()({tmpdir}, use);
  },
});

// TODO: Unify this with the test setup for the web SDK.
export const mockSyncServiceTest = tempDirectoryTest.extend<{syncService: MockSyncService}>({
  syncService: async ({}, use) => {
    // Don't install global fetch mocks, we want tests to be isolated!
    const fetchMock = new FetchMock(defaultFetchMockConfig);
    const listeners: ReadableStreamDefaultController<StreamingSyncLine>[] = [];

    fetchMock.route('path:/sync/stream', async () => {
      let thisController: ReadableStreamDefaultController<StreamingSyncLine> | null = null;

      const syncLines = new ReadableStream<StreamingSyncLine>({
        start(controller) {
          thisController = controller;
          listeners.push(controller);
        },
        cancel() {
          listeners.splice(listeners.indexOf(thisController!), 1);
        },
      });


      const encoder = new TextEncoder();
      const asLines = new TransformStream<StreamingSyncLine, Uint8Array>({
        transform: (chunk, controller) => {
          const line = `${JSON.stringify(chunk)}\n`;
          controller.enqueue(encoder.encode(line));
        },
      });

      return new Response(syncLines.pipeThrough(asLines), {status: 200});
    });
    fetchMock.catch(404);

    await use({
      clientOptions: {
        fetchImplementation: fetchMock.fetchHandler.bind(fetchMock),
      },
      get connectedListeners() {
        return listeners.length;
      },
      pushLine(line) {
        for (const listener of listeners) {
          listener.enqueue(line);
        }
      },
    });
  },
});

export const connectedDatabaseTest = mockSyncServiceTest.extend<{ database: PowerSyncDatabase }>({
  database: async ({ tmpdir, syncService }, use) => {
    const fixture = createDatabaseFixture({remoteOptions: syncService.clientOptions});
    await fixture({ tmpdir }, use);
  },
});

export interface MockSyncService {
  clientOptions: Partial<AbstractRemoteOptions>,
  pushLine: (line: StreamingSyncLine) => void,
  connectedListeners: number,
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

export function waitForSyncStatus(database: AbstractPowerSyncDatabase, matcher: (status: SyncStatus) => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (matcher(database.currentStatus)) {
      return resolve();
    }

    const dispose = database.registerListener({
      statusChanged: (status) => {
        if (matcher(status)) {
          dispose();
          resolve();
        }
      }
    });
  });
}
