/**
 * Credentials required to connect to a PowerSync instance.
 */
export type PowerSyncCredentials = {
  /** The PowerSync endpoint URL to connect to. */
  endpoint: string;
  /** Authentication token for the PowerSync service. */
  token: string;
};
/**
 * Provides credentials dynamically for PowerSync connections.
 * This allows for credential refresh and token rotation without
 * disconnecting the client.
 */
export abstract class Connector {
  protected _credentials: PowerSyncCredentials | null;
  protected _prefetchPromise: Promise<PowerSyncCredentials | null> | null;

  constructor() {
    this._credentials = null;
    this._prefetchPromise = null;
  }

  get cachedCredentials(): PowerSyncCredentials | null {
    return this._credentials;
  }

  /**
   * Called when cached credentials are detected to be invalid.
   */
  invalidateCredentials() {
    this._credentials = null;
  }

  async prefetchCredentials() {
    if (this._prefetchPromise) {
      return this._prefetchPromise;
    }
    return (this._prefetchPromise = this.fetchCredentials()
      .then((credentials) => {
        this._credentials = credentials;
        return this._credentials;
      })
      .finally(() => (this._prefetchPromise = null)));
  }

  /**
   * Fetches the current PowerSync credentials.
   * @returns A promise that resolves to credentials, or null if no credentials are available.
   */
  abstract fetchCredentials(): Promise<PowerSyncCredentials | null>;
}
