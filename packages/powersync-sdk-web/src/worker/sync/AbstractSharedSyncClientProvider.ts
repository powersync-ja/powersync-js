import { PowerSyncCredentials, SyncStatusOptions } from '@journeyapps/powersync-sdk-common';

/**
 * The client side port should provide these methods.
 */
export abstract class AbstractSharedSyncClientProvider {
  abstract fetchCredentials(): Promise<PowerSyncCredentials | null>;
  abstract uploadCrud(): Promise<void>;
  abstract statusChanged(status: SyncStatusOptions): void;

  abstract trace(...x: any[]): void;
  abstract debug(...x: any[]): void;
  abstract info(...x: any[]): void;
  abstract log(...x: any[]): void;
  abstract warn(...x: any[]): void;
  abstract error(...x: any[]): void;
  abstract time(label: string): void;
  abstract timeEnd(label: string): void;
}
