export * from './client/AbstractPowerSyncDatabase.js';
export * from './client/sync/bucket/BucketStorageAdapter.js';
export * from './client/sync/bucket/SqliteBucketStorage.js';
export * from './client/sync/stream/AbstractRemote.js';
export * from './client/sync/stream/AbstractStreamingSyncImplementation.js';

export * from './client/ConnectionManager.js';

export { MEMORY_TRIGGER_CLAIM_MANAGER } from './client/triggers/MemoryTriggerClaimManager.js';
export { TriggerManagerImpl } from './client/triggers/TriggerManagerImpl.js';
export * from './client/watched/DifferentialQueryProcessor.js';
export * from './client/watched/OnChangeQueryProcessor.js';

export * from './utils/AbortOperation.js';
export * from './utils/BaseObserver.js';
export * from './utils/mutex.js';
export type { SimpleAsyncIterator } from './utils/stream_transform.js';
