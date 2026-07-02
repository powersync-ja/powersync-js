import type { LogRecord, PowerSyncCredentials } from '@powersync/common';
import { SyncStatusJson } from '@powersync/shared-internals';

/**
 * The client side port should provide these methods.
 */
export abstract class AbstractSharedSyncClientProvider {
  abstract fetchCredentials(): Promise<PowerSyncCredentials | null>;
  abstract invalidateCredentials(): void;
  abstract uploadCrud(): Promise<void>;
  abstract statusChanged(status: SyncStatusJson): void;
  abstract getDBWorkerPort(): Promise<MessagePort>;

  abstract log(record: LogRecord): void;
}
