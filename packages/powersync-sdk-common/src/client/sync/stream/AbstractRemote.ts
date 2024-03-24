import Logger, { ILogger } from 'js-logger';
import { fetch } from 'cross-fetch';
import { PowerSyncCredentials } from '../../connection/PowerSyncCredentials';
import { StreamingSyncLine, StreamingSyncRequest } from './streaming-sync-types';
import { DataStream } from '../../../utils/DataStream';
import ndjsonStream from 'can-ndjson-stream';

export type RemoteConnector = {
  fetchCredentials: () => Promise<PowerSyncCredentials | null>;
};

// Refresh at least 30 sec before it expires
const REFRESH_CREDENTIALS_SAFETY_PERIOD_MS = 30_000;

export const DEFAULT_REMOTE_LOGGER = Logger.get('PowerSyncRemote');

export type SyncStreamOptions = {
  path: string;
  data: StreamingSyncRequest;
  headers?: Record<string, string>;
  abortSignal?: AbortSignal;
  fetchOptions?: Request;
};

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

  async post(path: string, data: any, headers: Record<string, string> = {}): Promise<any> {
    const request = await this.buildRequest(path);
    const res = await fetch(request.url, {
      method: 'POST',
      headers: {
        ...headers,
        ...request.headers
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when posting to ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  async get(path: string, headers?: Record<string, string>): Promise<any> {
    const request = await this.buildRequest(path);

    const res = await fetch(request.url, {
      method: 'GET',
      headers: {
        ...headers,
        ...request.headers
      }
    });

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when getting from ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  async postStreaming(
    path: string,
    data: any,
    headers: Record<string, string> = {},
    signal?: AbortSignal
  ): Promise<any> {
    const request = await this.buildRequest(path);

    const res = await fetch(request.url, {
      method: 'POST',
      headers: { ...headers, ...request.headers },
      body: JSON.stringify(data),
      signal,
      //@ts-ignore
      cache: 'no-store'
    }).catch((ex) => {
      console.error(`Caught ex when POST streaming to ${path}`, ex);
      throw ex;
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    return res;
  }

  /**
   * Connects to the sync/stream websocket endpoint
   */
  abstract socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>>;

  /**
   * Connects to the sync/stream http endpoint
   */
  async postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    const { data, path, headers, abortSignal } = options;

    const request = await this.buildRequest(path);

    const res = await fetch(request.url, {
      method: 'POST',
      headers: { ...headers, ...request.headers },
      body: JSON.stringify(data),
      signal: abortSignal,
      cache: 'no-store',
      ...options.fetchOptions
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      console.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    // TODO handle closing errors better
    const jsonS = ndjsonStream(res.body!);
    const stream = new DataStream();

    const r = jsonS.getReader();

    const l = stream.registerListener({
      lowWater: async () => {
        const { done, value } = await r.read();
        // Exit if we're done
        if (done) {
          stream.close();
          l?.();
          return;
        }
        stream.enqueueData(value);
      },
      closed: () => {
        l?.();
      }
    });

    return stream;
  }
}
