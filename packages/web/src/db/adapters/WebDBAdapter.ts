import { DBAdapter } from '@powersync/common';
import { ResolvedWebSQLOpenOptions } from './web-sql-flags';

export type SharedConnectionWorker = {
  identifier: string;
  port: MessagePort;
};

export interface WebDBAdapter extends DBAdapter {
  /**
   * Get a MessagePort which can be used to share the internals of this connection.
   */
  shareConnection(): Promise<SharedConnectionWorker>;

  /**
   * Get the config options used to open this connection.
   * This is useful for sharing connections.
   */
  getConfiguration(): ResolvedWebSQLOpenOptions;
}
