import Logger, { ILogger } from 'js-logger';
import { fetch } from 'cross-fetch';
import { PowerSyncCredentials } from '../../connection/PowerSyncCredentials';
import { StreamingSyncLine, StreamingSyncRequest } from './streaming-sync-types';
import { DataStream } from '../../../utils/DataStream';
import ndjsonStream from 'can-ndjson-stream';
import { RSocketConnector } from 'rsocket-core';
import { WebsocketClientTransport } from 'rsocket-websocket-client';
import { serialize, deserialize } from 'bson';

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
      cache: 'no-store'
    }).catch((ex) => {
      this.logger.error(`Caught ex when POST streaming to ${path}`, ex);
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
  async socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    const connector = new RSocketConnector({
      transport: new WebsocketClientTransport({
        url: `ws://localhost:8080`
      })
    });

    // TODO better URL
    const request = await this.buildRequest('/sync/stream');
    const rsocket = await connector.connect();
    const stream = new DataStream();
    const res = rsocket.requestStream(
      {
        data: Buffer.from(serialize(options.data)),
        metadata: Buffer.from(
          serialize({
            token:
              'Token eyJhbGciOiJSUzI1NiIsImtpZCI6InBvd2Vyc3luYy0wZTNkNTM1NGYyIn0.eyJzdWIiOiJhbm9ueW1vdXMiLCJpYXQiOjE3MTEzNTA1NDAsImlzcyI6ImxvY2FsaG9zdCIsImF1ZCI6ImxvY2FsaG9zdCIsImV4cCI6MTcxMTQzNjk0MH0.rLu02FtNOj27KohYmpzBohB1JSuDnMVES-FcSyc8Xth61TG1ngsb8RbFfzufusjFCwubQREZyGHGbcsIypkMXGRokrbsH5dUb0BeG3ROU016eKVaya2zMnjh2d0Nh1WBucoFnlJzwQxZyLCEQds85kfMsoih7FOASG2dY9gq73Dfc4rUf02YELl52pRkziXFSd4ZMLwTKpc9g554vwqUTQQZiW0JnVXiIAlEKDEqhF-JkEU5GEGgwzL0c-E_XIzFy615DhThAd2X1vAILDnKVjVdUgD0QYGKHZFwQ9Zq7I37IPhaxfnOpMGZoIuxsdBNIzS7pfkmOLc3JmJ-94oRPA' //request.headers.Authorization
          })
        )
      },
      1,
      {
        onError: (e) => {
          this.logger.error(e);
          stream.close();
        },
        onNext: (payload) => {
          const { data } = payload;
          if (!data) {
            return;
          }
          const deserializedData = deserialize(data);
          stream.enqueueData(deserializedData);
        },
        onComplete: () => {
          stream.close();
        },
        onExtension: () => {}
      }
    );

    const l = stream.registerListener({
      lowWater: async () => {
        res.request(1);
      },
      closed: () => {
        l?.();
      }
    });

    return stream;
  }

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
      this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    // TODO handle closing errors better
    const jsonS = ndjsonStream(res.body!);
    const stream = new DataStream({
      logger: this.logger
    });

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
