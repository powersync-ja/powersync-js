import { PowerSyncCredentials } from './PowerSyncCredentials.js';
import { CommonPowerSyncDatabase } from '../CommonPowerSyncDatabase.js';

/**
 * @public
 */
export interface PowerSyncBackendConnector {
  /** Allows the PowerSync client to retrieve an authentication token from your backend
   * which is used to authenticate against the PowerSync service.
   *
   * This should always fetch a fresh set of credentials - don't use cached
   * values.
   *
   * Return null if the user is not signed in. Throw an error if credentials
   * cannot be fetched due to a network error or other temporary error.
   *
   * This token is kept for the duration of a sync connection.
   */
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;

  /** Upload local changes to the app backend.
   *
   * Use {@link CommonPowerSyncDatabase.getCrudBatch} to get a batch of changes to upload.
   *
   * Any thrown errors will result in a retry after the configured wait period (default: 5 seconds).
   */
  uploadData: (database: CommonPowerSyncDatabase) => Promise<void>;

  /**
   * Posts a client-generated checkpoint request to the backend and returns the effective checkpoint request state.
   *
   * This method is optional. It only needs to be implemented when the selected {@link CheckpointMode} is `requests`
   * and [asynchronous backend uploads](https://docs.powersync.com/client-sdks/advanced/checkpoint-requests#asynchronous-upload-backends)
   * are used. In any other case, this method should not be present on backend connectors.
   *
   * @param requestId The client-generated checkpoint request ID (a positive 64-bit integer encoded as a string).
   * @param clientId The PowerSync client ID for the current device.
   */
  postCheckpointRequest?(clientId: string, requestId: string): Promise<string>;
}
