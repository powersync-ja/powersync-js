import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AsyncDatabaseConnection } from '../src/db/adapters/AsyncDatabaseConnection';
import {
  DEFAULT_WEB_SQL_FLAGS,
  TemporaryStorageOption,
  type ResolvedWebSQLOpenOptions
} from '../src/db/adapters/web-sql-flags';

let WASQLiteOpenFactory: typeof import('@powersync/web').WASQLiteOpenFactory;
let WASQLiteVFS: typeof import('@powersync/web').WASQLiteVFS;

let nextOpenPromise: Promise<unknown> | null = null;
const baseConfig: ResolvedWebSQLOpenOptions = {
  dbFilename: 'crm.sqlite',
  flags: DEFAULT_WEB_SQL_FLAGS,
  temporaryStorage: TemporaryStorageOption.MEMORY,
  cacheSizeKb: 1
};

const baseConnection: AsyncDatabaseConnection = {
  init: async () => {},
  close: async () => {},
  markHold: async () => 'hold',
  releaseHold: async () => {},
  isAutoCommit: async () => true,
  execute: async () => ({ rows: { _array: [], length: 0 }, rowsAffected: 0, insertId: 0 }),
  executeRaw: async () => [],
  executeBatch: async () => ({ rows: { _array: [], length: 0 }, rowsAffected: 0, insertId: 0 }),
  registerOnTableChange: async () => () => {},
  getConfig: async () => baseConfig
};

vi.mock('comlink', async () => {
  const actual = await vi.importActual<typeof import('comlink')>('comlink');
  return {
    ...actual,
    wrap: () => {
      const opener = (() => nextOpenPromise ?? Promise.resolve(baseConnection)) as unknown as ReturnType<
        typeof actual.wrap
      >;
      opener[actual.releaseProxy] = () => {};
      return opener;
    }
  };
});

describe('OPFS pagehide cleanup', { sequential: true }, () => {
  let originalWorker: typeof Worker;
  let workers: Worker[] = [];
  let terminated = false;
  let terminateCount = 0;

  beforeEach(() => {
    terminated = false;
    terminateCount = 0;
    workers = [];
    nextOpenPromise = null;
    originalWorker = window.Worker;
    window.Worker = new Proxy(originalWorker, {
      construct(target, args) {
        const instance = new target(...(args as ConstructorParameters<typeof Worker>));
        workers.push(instance);
        const originalTerminate = instance.terminate.bind(instance);
        instance.terminate = () => {
          terminated = true;
          terminateCount += 1;
          return originalTerminate();
        };
        return instance;
      }
    });
  });

  afterEach(() => {
    workers.forEach((worker) => {
      try {
        worker.terminate();
      } catch {
        // Ignore termination errors during cleanup.
      }
    });
    window.Worker = originalWorker;
  });

  beforeEach(async () => {
    ({ WASQLiteOpenFactory, WASQLiteVFS } = await import('@powersync/web'));
  });

  it('terminates dedicated worker on pagehide for OPFS VFS', async () => {
    const factory = new WASQLiteOpenFactory({
      dbFilename: `pagehide-${crypto.randomUUID()}.db`,
      vfs: WASQLiteVFS.OPFSCoopSyncVFS,
      flags: { enableMultiTabs: false, useWebWorker: true }
    });

    await factory.openConnection();

    const cached = new Event('pagehide') as PageTransitionEvent;
    Object.defineProperty(cached, 'persisted', { value: true });
    window.dispatchEvent(cached);

    await vi.waitFor(() => expect(terminated).toBe(true));
  });

  it('defers termination until open completes when pagehide fires during open for OPFS VFS', async () => {
    let resolveOpen!: (connection: unknown) => void;
    nextOpenPromise = new Promise<unknown>((resolve) => {
      resolveOpen = resolve;
    });

    const factory = new WASQLiteOpenFactory({
      dbFilename: `pagehide-${crypto.randomUUID()}.db`,
      vfs: WASQLiteVFS.OPFSCoopSyncVFS,
      flags: { enableMultiTabs: false, useWebWorker: true }
    });

    const openTask = factory.openConnection();

    const pagehide = new Event('pagehide') as PageTransitionEvent;
    window.dispatchEvent(pagehide);
    const terminatedAfterPagehide = terminated;

    resolveOpen(baseConnection);
    await openTask;
    await Promise.resolve();

    expect(terminatedAfterPagehide).toBe(false);
    await vi.waitFor(() => expect(terminated).toBe(true));
  });

  it('ignores repeated pagehide events during open for OPFS VFS', async () => {
    let resolveOpen!: (connection: unknown) => void;
    nextOpenPromise = new Promise<unknown>((resolve) => {
      resolveOpen = resolve;
    });

    const factory = new WASQLiteOpenFactory({
      dbFilename: `pagehide-${crypto.randomUUID()}.db`,
      vfs: WASQLiteVFS.OPFSCoopSyncVFS,
      flags: { enableMultiTabs: false, useWebWorker: true }
    });

    const openTask = factory.openConnection();

    const firstPagehide = new Event('pagehide') as PageTransitionEvent;
    window.dispatchEvent(firstPagehide);
    const terminatedAfterFirst = terminated;
    const terminateCountAfterFirst = terminateCount;

    const secondPagehide = new Event('pagehide') as PageTransitionEvent;
    window.dispatchEvent(secondPagehide);
    const terminatedAfterSecond = terminated;
    const terminateCountAfterSecond = terminateCount;

    resolveOpen(baseConnection);
    await openTask;
    await Promise.resolve();

    expect(terminatedAfterFirst).toBe(false);
    expect(terminatedAfterSecond).toBe(false);
    expect(terminateCountAfterFirst).toBe(0);
    expect(terminateCountAfterSecond).toBe(0);
    await vi.waitFor(() => expect(terminateCount).toBe(1));
  });
});
