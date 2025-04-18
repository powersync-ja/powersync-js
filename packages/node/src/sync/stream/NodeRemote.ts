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
import { ProxyAgent } from 'undici';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

class NodeFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return fetch.bind(globalThis);
  }
}

export class NodeRemote extends AbstractRemote {
  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    // Automatic env vars are not supported by undici
    // proxy-agent does not work directly with dispatcher
    const proxy = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
    super(connector, logger, {
      ...(options ?? {}),
      fetchImplementation: options?.fetchImplementation ?? new NodeFetchProvider(),
      fetchOptions: {
        dispatcher: proxy ? new ProxyAgent(proxy) : undefined
      }
    });
  }

  // protected createSocket(url: string): globalThis.WebSocket {
  //   return new WebSocket(url, {
  //     // agent: new ProxyAgent(),
  //     headers: {
  //       'User-Agent': this.getUserAgent()
  //     }
  //   }) as any as globalThis.WebSocket;
  // }

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
