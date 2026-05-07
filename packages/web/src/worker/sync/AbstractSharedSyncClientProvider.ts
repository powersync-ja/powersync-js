import type { PowerSyncCredentials, SyncStatusOptions } from '@powersync/common';

/**
 * The client side port should provide these methods.
 */
export abstract class AbstractSharedSyncClientProvider {
  abstract fetchCredentials(): Promise<PowerSyncCredentials | null>;
  abstract invalidateCredentials(): void;
  abstract uploadCrud(): Promise<void>;
  abstract statusChanged(status: SyncStatusOptions): void;
  abstract getDBWorkerPort(): Promise<MessagePort>;

  abstract log(level: number, ...message: any[]): void;
}
