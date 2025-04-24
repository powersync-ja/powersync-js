import * as os from 'node:os';

import {
  type ILogger,
  AbstractRemote,
  AbstractRemoteOptions,
  BSONImplementation,
  DEFAULT_REMOTE_LOGGER,
  FetchImplementation,
  FetchImplementationProvider,
  RemoteConnector
} from '@powersync/common';
import { BSON } from 'bson';
import Agent from 'proxy-agent';
import { EnvHttpProxyAgent, Dispatcher } from 'undici';
import { WebSocket } from 'ws';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

class NodeFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return fetch.bind(globalThis);
  }
}

export type NodeRemoteOptions = AbstractRemoteOptions & {
  dispatcher?: Dispatcher;
};

export class NodeRemote extends AbstractRemote {
  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<NodeRemoteOptions>
  ) {
    // EnvHttpProxyAgent automatically uses relevant env vars for HTTP
    const dispatcher = options?.dispatcher ?? new EnvHttpProxyAgent();

    super(connector, logger, {
      ...(options ?? {}),
      fetchImplementation: options?.fetchImplementation ?? new NodeFetchProvider(),
      fetchOptions: {
        dispatcher
      }
    });
  }

  protected createSocket(url: string): globalThis.WebSocket {
    return new WebSocket(url, {
      // Automatically uses relevant env vars for web sockets
      agent: new Agent.ProxyAgent(),
      headers: {
        'User-Agent': this.getUserAgent()
      }
    }) as any as globalThis.WebSocket; // This is compatible in Node environments
  }

  getUserAgent(): string {
    return [
      super.getUserAgent(),
      `powersync-node`,
      `node/${process.versions.node}`,
      `${os.platform()}/${os.release()}`
    ].join(' ');
  }

  async getBSON(): Promise<BSONImplementation> {
    return BSON;
  }
}
