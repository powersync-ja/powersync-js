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
import { ProxyAgent } from 'undici';
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
    // Automatic env vars are not supported by undici
    // proxy-agent does not work directly with dispatcher
    const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
    const agent = proxy ? new ProxyAgent(proxy) : undefined;

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
      // Undici does not seem to be compatible with ws, using `proxy-agent` instead.
      // Automatically uses WS_PROXY or WSS_PROXY env vars
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
