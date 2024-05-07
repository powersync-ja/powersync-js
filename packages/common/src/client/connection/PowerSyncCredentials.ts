export enum SyncStreamConnectionMethod {
  HTTP = 'http',
  WEB_SOCKET = 'web-socket'
}

export interface PowerSyncCredentials {
  endpoint: string;
  token: string;
  expiresAt?: Date;
  /**
   * The connection method to use when streaming updates from
   * the PowerSync backend instance.
   * Defaults to HTTP streaming
   */
  streamConnectionMethod?: SyncStreamConnectionMethod;
}
