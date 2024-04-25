import Logger, { ILogger } from 'js-logger';
import { PowerSyncCredentials } from '../../connection/PowerSyncCredentials';

export type RemoteConnector = {
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;
};

// Refresh at least 30 sec before it expires
const REFRESH_CREDENTIALS_SAFETY_PERIOD_MS = 30_000;

export const DEFAULT_REMOTE_LOGGER = Logger.get('PowerSyncRemote');

export abstract class AbstractRemote {
  protected credentials: PowerSyncCredentials | null = null;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER
  ) {}

  async getCredentials(): Promise<PowerSyncCredentials | null> {
    const { expiresAt } = this.credentials ?? {};
    if (expiresAt && expiresAt > new Date(new Date().valueOf() + REFRESH_CREDENTIALS_SAFETY_PERIOD_MS)) {
      return this.credentials!;
    }
    this.credentials = await this.connector.fetchCredentials();
    return this.credentials;
  }

  protected async buildRequest(path: string) {
    const credentials = await this.getCredentials();
    if (credentials != null && (credentials.endpoint == null || credentials.endpoint == '')) {
      throw new Error('PowerSync endpoint not configured');
    } else if (credentials?.token == null || credentials?.token == '') {
      const error: any = new Error(`Not signed in`);
      error.status = 401;
      throw error;
    }

    return {
      url: credentials.endpoint + path,
      headers: {
        'content-type': 'application/json',
        Authorization: `Token ${credentials.token}`
      }
    };
  }

  abstract post(path: string, data: any, headers?: Record<string, string>): Promise<any>;
  abstract get(path: string, headers?: Record<string, string>): Promise<any>;
  abstract postStreaming(path: string, data: any, headers?: Record<string, string>, signal?: AbortSignal): Promise<any>;

  isAvailable() {
    return true;
  }
}
