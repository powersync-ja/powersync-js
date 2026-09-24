import { PowerSyncCredentials } from './PowerSyncCredentials.js';
import { CommonPowerSyncDatabase } from '../CommonPowerSyncDatabase.js';

/**
 * @public
 */
export interface PostCustomCheckpoints {
  /**
   * Posts a client-generated checkpoint request to the backend and returns the effective checkpoint request state.
   *
   * This method is optional. It only needs to be implemented when the selected {@link CheckpointMode} is `requests`
   * and [asynchronous backend uploads](https://docs.powersync.com/client-sdks/advanced/checkpoint-requests#asynchronous-upload-backends)
   * are used. In any other case, this method should not be present on backend connectors.
   *
   * @param requestId - The client-generated checkpoint request ID (a positive 64-bit integer encoded as a string).
   * @param clientId - The PowerSync client ID for the current device.
   * @param signal - An optional abort signal that completes when the checkpoint is no longer necessary.
   */
  postCheckpointRequest?(clientId: string, requestId: string, signal?: AbortSignal): Promise<string>;
}

/**
 * @public
 */
export interface PowerSyncBackendConnector extends PostCustomCheckpoints {
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
}

/**
 * Authenticates the PowerSync SDK against a PowerSync service, allowing it to download changes.
 *
 * @public
 */
export interface Authenticator extends PostCustomCheckpoints {
  /**
   * Obtain a token used to authenticate against a PowerSync service.
   *
   * @param options - Options, including an abort signal completing when the SDK is no longer interested in these
   * credentials. Supported authenticators can reject the promise with the `AbortSignal.reason` when aborted.
   * @returns A promise resolving to PowerSync credentials. It may reject when credentials could not be resolved.
   */
  resolveCredentials(options: ResolveCredentialsOptions): Promise<string>;

  /**
   * Invoked by the SDK when the PowerSync service has rejected credentials previously returned by
   * {@link resolveCredentials}.
   *
   * Subsequent calls to {@link resolveCredentials} should return new credentials in this case.
   */
  invalidateCredentials?(): void;
}

/**
 * The signature of a function uploading local mutations to a backend.
 *
 * @public
 */
export type MutationUploader = (options: UploadMutationsOptions) => Promise<void>;

/**
 * Base interface for options with an abort signal.
 *
 * @public
 */
export interface HasAbortSignal {
  /**
   * An optional abort signal, owned by the SDK.
   *
   * This signal completes when the SDK is no longer interested in the operation is triggered, e.g. because
   * {@link CommonPowerSyncDatabase.disconnect} was called.
   * Compatible {@link Authenticator} and {@link MutationUploader} implementations may use this to abort their work, but
   * this is not required.
   */
  abort?: AbortSignal;
}

/**
 * Options passed to {@link Authenticator.resolveCredentials}.
 *
 * @public
 */
export interface ResolveCredentialsOptions extends HasAbortSignal {}

/**
 * Options passed to {@link MutationUploader}.
 *
 * @public
 */
export interface UploadMutationsOptions extends HasAbortSignal {
  /**
   * The database on which {@link CommonPowerSyncDatabase.connect} has been called, for convenience.
   */
  database: CommonPowerSyncDatabase;
}
