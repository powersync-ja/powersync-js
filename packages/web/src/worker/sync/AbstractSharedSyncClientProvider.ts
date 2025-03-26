import type { PowerSyncCredentials, SyncStatusOptions } from '@powersync/common';

/**
 * The client side port should provide these methods.
 */
export interface SharedSyncClientProvider {
  fetchCredentials(): Promise<PowerSyncCredentials | null>;
  uploadCrud(): Promise<void>;
  statusChanged(status: SyncStatusOptions): void;
  getDBWorkerPort(): Promise<MessagePort>;
  releaseSharedConnection(): void;

  trace(...x: any[]): void;
  debug(...x: any[]): void;
  info(...x: any[]): void;
  log(...x: any[]): void;
  warn(...x: any[]): void;
  error(...x: any[]): void;
  time(label: string): void;
  timeEnd(label: string): void;
}
