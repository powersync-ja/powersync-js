import * as os from 'node:os';

import { ILogger } from 'js-logger';

import {
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
import { ProxyAgent, EnvHttpProxyAgent } from 'undici';
import { WebSocket } from 'ws';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

class NodeFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return fetch.bind(globalThis);
  }
}

export class NodeRemote extends AbstractRemote {
  protected agent: ProxyAgent | undefined;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    // Automatically uses relevant env vars for HTTP
    const agent = new EnvHttpProxyAgent();

    super(connector, logger, {
      ...(options ?? {}),
      fetchImplementation: options?.fetchImplementation ?? new NodeFetchProvider(),
      fetchOptions: {
        dispatcher: agent
      }
    });

    this.agent = agent;
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
