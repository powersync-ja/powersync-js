export * from './client/BasePowerSyncDatabase.js';
export * from './client/sync/bucket/BucketStorageAdapter.js';
export * from './client/sync/bucket/CrudEntry.js';
export * from './client/sync/bucket/SqliteBucketStorage.js';
export * from './client/sync/stream/AbstractRemote.js';
export * from './client/sync/stream/AbstractStreamingSyncImplementation.js';
export * from './client/sync/stream/core-instruction.js';
export * from './db/ConnectionClosedError.js';
export * from './db/openDatabase.js';
export * from './db/crud/SyncStatus.js';
export * from './client/ConnectionManager.js';
export * from './client/sync/options.js';

export { MEMORY_TRIGGER_CLAIM_MANAGER } from './client/triggers/MemoryTriggerClaimManager.js';
export * from './client/triggers/TriggerManagerImpl.js';
export * from './client/watched/DifferentialQueryProcessor.js';
export * from './client/watched/OnChangeQueryProcessor.js';

export * from './utils/AbortOperation.js';
export * from './utils/compatibility.js';
export * from './utils/ControlledExecutor.js';
export * from './utils/mutex.js';
export * from './utils/parseQuery.js';
export type { SimpleAsyncIterator } from './utils/stream_transform.js';
