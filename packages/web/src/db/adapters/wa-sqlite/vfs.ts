import type * as SQLite from '@journeyapps/wa-sqlite';

/**
 * List of currently tested virtual filesystems
 */
export enum WASQLiteVFS {
  IDBBatchAtomicVFS = 'IDBBatchAtomicVFS',
  OPFSCoopSyncVFS = 'OPFSCoopSyncVFS',
  AccessHandlePoolVFS = 'AccessHandlePoolVFS'
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

/**
 * @internal
 */
export const AsyncWASQLiteModuleFactory = async () => {
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs');
  return factory();
};

/**
 * @internal
 */
export const MultiCipherAsyncWASQLiteModuleFactory = async () => {
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs');
  return factory();
};

/**
 * @internal
 */
export const SyncWASQLiteModuleFactory = async () => {
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite.mjs');
  return factory();
};

/**
 * @internal
 */
export const MultiCipherSyncWASQLiteModuleFactory = async () => {
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs');
  return factory();
};

/**
 * @internal
 */
export const DEFAULT_MODULE_FACTORIES = {
  [WASQLiteVFS.IDBBatchAtomicVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    let module;
    if (options.encryptionKey) {
      module = await MultiCipherAsyncWASQLiteModuleFactory();
    } else {
      module = await AsyncWASQLiteModuleFactory();
    }
    const { IDBBatchAtomicVFS } = await import('@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js');
    return {
      module,
      // @ts-expect-error The types for this static method are missing upstream
      vfs: await IDBBatchAtomicVFS.create(options.dbFileName, module, { lockPolicy: 'exclusive' })
    };
  },
  [WASQLiteVFS.AccessHandlePoolVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    let module;
    if (options.encryptionKey) {
      module = await MultiCipherSyncWASQLiteModuleFactory();
    } else {
      module = await SyncWASQLiteModuleFactory();
    }
    // @ts-expect-error The types for this static method are missing upstream
    const { AccessHandlePoolVFS } = await import('@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js');
    return {
      module,
      vfs: await AccessHandlePoolVFS.create(options.dbFileName, module)
    };
  },
  [WASQLiteVFS.OPFSCoopSyncVFS]: async (options: WASQLiteModuleFactoryOptions) => {
    let module;
    if (options.encryptionKey) {
      module = await MultiCipherSyncWASQLiteModuleFactory();
    } else {
      module = await SyncWASQLiteModuleFactory();
    }
    // @ts-expect-error The types for this static method are missing upstream
    const { OPFSCoopSyncVFS } = await import('@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js');
    const vfs = await OPFSCoopSyncVFS.create(options.dbFileName, module);
    return {
      module,
      vfs
    };
  }
};
