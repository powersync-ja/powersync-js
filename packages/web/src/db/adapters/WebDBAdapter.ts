import { DBAdapter } from '@powersync/common';

export type SharedConnectionWorker = {
  identifier: string;
  port: MessagePort;
};

export interface WebDBAdapter extends DBAdapter {
  /**
   * Get a MessagePort which can be used to share the internals of this connection.
   */
  shareConnection(): Promise<SharedConnectionWorker>;
}
