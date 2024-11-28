import { DBAdapter } from '@powersync/common';

export interface WorkerDBAdapter extends DBAdapter {
  /**
   * Get a MessagePort which can be used to share the internals of this connection.
   */
  getMessagePort(): MessagePort | Worker;
}
