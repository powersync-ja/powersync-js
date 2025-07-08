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
import {
  Dispatcher,
  EnvHttpProxyAgent,
  ErrorEvent,
  getGlobalDispatcher,
  ProxyAgent,
  WebSocket as UndiciWebSocket
} from 'undici';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

class NodeFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return fetch.bind(globalThis);
  }
}

export type NodeCustomConnectionOptions = {
  /**
   * Optional custom dispatcher for HTTP or WEB_SOCKET connections.
   *
   * This can be used to customize proxy usage (using undici ProxyAgent),
   * or other connection options.
   */
  dispatcher?: Dispatcher;
};

export type NodeRemoteOptions = AbstractRemoteOptions & NodeCustomConnectionOptions;

export class NodeRemote extends AbstractRemote {
  private wsDispatcher: Dispatcher | undefined;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<NodeRemoteOptions>
  ) {
    const fetchDispatcher = options?.dispatcher ?? defaultFetchDispatcher();

    super(connector, logger, {
      fetchImplementation: options?.fetchImplementation ?? new NodeFetchProvider(),
      fetchOptions: {
        dispatcher: fetchDispatcher
      },
      ...(options ?? {})
    });

    this.wsDispatcher = options?.dispatcher;
  }

  protected createSocket(url: string): globalThis.WebSocket {
    // Create dedicated dispatcher for this WebSocket
    const baseDispatcher = this.getWebsocketDispatcher(url);

    // Create WebSocket with dedicated dispatcher
    const ws = new UndiciWebSocket(url, {
      dispatcher: baseDispatcher,
      headers: {
        'User-Agent': this.getUserAgent()
      }
    });

    return ws as globalThis.WebSocket;
  }

  protected getWebsocketDispatcher(url: string) {
    if (this.wsDispatcher != null) {
      return this.wsDispatcher;
    }

    const protocol = new URL(url).protocol.replace(':', '');
    const proxy = getProxyForProtocol(protocol);
    if (proxy != null) {
      return new ProxyAgent(proxy);
    } else {
      return getGlobalDispatcher();
    }
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

function defaultFetchDispatcher(): Dispatcher {
  // EnvHttpProxyAgent automatically uses HTTP_PROXY, HTTPS_PROXY and NO_PROXY env vars by default.
  // We add ALL_PROXY support.
  return new EnvHttpProxyAgent({
    httpProxy: getProxyForProtocol('http'),
    httpsProxy: getProxyForProtocol('https')
  });
}

function getProxyForProtocol(protocol: string): string | undefined {
  return (
    process.env[`${protocol.toLowerCase()}_proxy`] ??
    process.env[`${protocol.toUpperCase()}_PROXY`] ??
    process.env[`all_proxy`] ??
    process.env[`ALL_PROXY`]
  );
}
