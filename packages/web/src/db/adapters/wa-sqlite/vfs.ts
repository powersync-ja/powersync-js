import type * as SQLite from '@journeyapps/wa-sqlite';

/**
 * List of currently tested virtual filesystems
 */
export enum WASQLiteVFS {
  IDBBatchAtomicVFS = 'IDBBatchAtomicVFS',
  OPFSCoopSyncVFS = 'OPFSCoopSyncVFS',
  AccessHandlePoolVFS = 'AccessHandlePoolVFS',
  OPFSWriteAheadVFS = 'OPFSWriteAheadVFS'
}

export function vfsRequiresDedicatedWorkers(vfs: WASQLiteVFS) {
  return vfs != WASQLiteVFS.IDBBatchAtomicVFS;
}

/**
 * @internal
 */
export type WASQLiteModuleFactoryOptions = { dbFileName: string; encryptionKey?: string };

/**
 * @internal
 */
export type SQLiteModule = Parameters<typeof SQLite.Factory>[0];

/**
 * @internal
 */
export type WASQLiteModuleFactory = (
  options: WASQLiteModuleFactoryOptions
) => Promise<{ module: SQLiteModule; vfs: SQLiteVFS }>;

async function asyncModuleFactory(encryptionKey: unknown) {
  if (encryptionKey) {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs');
    return factory();
  } else {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs');
    return factory();
  }
}

async function syncModuleFactory(encryptionKey: unknown) {
  if (encryptionKey) {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs');
    return factory();
  } else {
    const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite.mjs');
    return factory();
  }
}

/**
 * @internal
 */
export const DEFAULT_MODULE_FACTORIES = {
  [WASQLiteVFS.IDBBatchAtomicVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    const module = await asyncModuleFactory(options.encryptionKey);
    const { IDBBatchAtomicVFS } = await import('@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
    return {
      module,
      // @ts-expect-error The types for this static method are missing upstream
      vfs: await IDBBatchAtomicVFS.create(options.dbFileName, module, { lockPolicy: 'exclusive' })
    };
  },
  [WASQLiteVFS.AccessHandlePoolVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    const module = await syncModuleFactory(options.encryptionKey);
    // @ts-expect-error The types for this static method are missing upstream
    const { AccessHandlePoolVFS } = await import('@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js');
    return {
      module,
      vfs: await AccessHandlePoolVFS.create(options.dbFileName, module)
    };
  },
  [WASQLiteVFS.OPFSCoopSyncVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    const module = await syncModuleFactory(options.encryptionKey);
    // @ts-expect-error The types for this static method are missing upstream
    const { OPFSCoopSyncVFS } = await import('@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js');
    const vfs = await OPFSCoopSyncVFS.create(options.dbFileName, module);
    return {
      module,
      vfs
    };
  },
  [WASQLiteVFS.OPFSWriteAheadVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    const module = await syncModuleFactory(options.encryptionKey);
    // @ts-expect-error The types for this static method are missing upstream
    const { OPFSWriteAheadVFS } = await import('@journeyapps/wa-sqlite/src/examples/OPFSWriteAheadVFS.js');
    const vfs = await OPFSWriteAheadVFS.create(options.dbFileName, module, {});
    return {
      module,
      vfs
    };
  }
};
