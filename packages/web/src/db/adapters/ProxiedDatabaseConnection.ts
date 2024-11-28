import { AsyncDatabaseConnection } from './AsyncDatabaseConnection';

export interface ProxiedDatabaseConnection extends AsyncDatabaseConnection {
  /**
   * Get a MessagePort which can be used to share the internals of this connection.
   */
  getMessagePort(): MessagePort;
}
