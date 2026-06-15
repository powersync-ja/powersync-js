export * from './attachments/AttachmentContext.js';
export * from './attachments/AttachmentErrorHandler.js';
export * from './attachments/AttachmentQueue.js';
export * from './attachments/LocalStorageAdapter.js';
export * from './attachments/RemoteStorageAdapter.js';
export * from './attachments/Schema.js';
export * from './attachments/WatchedAttachmentItem.js';

export * from './client/CommonPowerSyncDatabase.js';
export { compilableQueryWatch, CompilableQueryWatchHandler } from './client/compilableQueryWatch.js';
export * from './client/connection/PowerSyncBackendConnector.js';
export * from './client/connection/PowerSyncCredentials.js';
export * from './client/SQLOpenFactory.js';
export * from './client/sync/bucket/CrudBatch.js';
export { CrudEntry, OpId, UpdateType } from './client/sync/bucket/CrudEntry.js';
export * from './client/sync/bucket/CrudTransaction.js';
export * from './client/sync/stream/JsonValue.js';
export * from './client/sync/sync-streams.js';
export { SyncOptions, SyncStreamConnectionMethod, FetchStrategy } from './client/sync/options.js';

export { ProgressWithOperations, SyncProgress } from './db/crud/SyncProgress.js';
export * from './db/crud/SyncStatus.js';
export * from './db/crud/UploadQueueStatus.js';
export * from './db/DBAdapter.js';
export * from './db/schema/Column.js';
export * from './db/schema/Index.js';
export * from './db/schema/IndexedColumn.js';
export { PendingStatement, PendingStatementParameter, RawTableType } from './db/schema/RawTable.js';
export * from './db/schema/Schema.js';
export * from './db/schema/Table.js';
export * from './db/schema/TableV2.js';

export * from './client/Query.js';
export * from './client/triggers/sanitizeSQL.js';
export * from './client/triggers/TriggerManager.js';
export * from './client/watched/GetAllQuery.js';
export * from './client/watched/processors/comparators.js';
export * from './client/watched/processors/DifferentialQueryProcessor.js';
export * from './client/watched/processors/OnChangeQueryProcessor.js';
export * from './client/watched/WatchedQuery.js';

export { type Mutex } from './utils/mutex.js';
export * from './utils/BaseObserver.js';
export * from './utils/MetaBaseObserver.js';
export * from './utils/Logger.js';

export * from './types/types.js';
