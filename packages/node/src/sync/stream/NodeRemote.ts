import * as os from 'node:os';

import { AbstractRemote, FetchOptions, RemoteConnector } from '@powersync/shared-internals';
import { Dispatcher, EnvHttpProxyAgent, getGlobalDispatcher, ProxyAgent, WebSocket as UndiciWebSocket } from 'undici';
import { PowerSyncLogger } from '@powersync/common';
import type { WebSocketSyncStreamPlatform, WebSocketSupport } from '@powersync/shared-internals/websockets';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

export interface NodeRemoteOptions {
  /**
   * @internal Only meant to be used for tests.
   */
  customFetch?: typeof fetch;

  /**
   * Optional custom dispatcher for HTTP or WEB_SOCKET connections.
   *
   * This can be used to customize proxy usage (using undici ProxyAgent),
   * or other connection options.
   */
  dispatcher?: Dispatcher;
}

export class NodeRemote extends AbstractRemote {
  private wsDispatcher: Dispatcher | undefined;
  private fetchImpl: typeof fetch;

  constructor(
    protected connector: RemoteConnector,
    logger: PowerSyncLogger,
    options?: NodeRemoteOptions
  ) {
    super(connector, logger);

    this.fetchImpl =
      options?.customFetch ??
      ((resource, init) => {
        const dispatcher = options?.dispatcher ?? defaultFetchDispatcher();

        return fetch(resource, {
          // @ts-expect-error
          dispatcher,
          ...init
        });
      });

    this.wsDispatcher = options?.dispatcher;
  }

  protected fetch({ resource, request }: FetchOptions): Promise<Response> {
    return this.fetchImpl(resource, request);
  }

  protected async loadWebSocketSupport(platform: WebSocketSyncStreamPlatform): Promise<WebSocketSupport> {
    if (!websockets) {
      // loadWebSocketSupport being called concurrently is safe, the import resolves to the same module in that case.
      const module = await import('@powersync/shared-internals/websockets');
      websockets = new module.WebSocketSupport(platform);
    }

    return websockets;
  }

  createSocket(url: string): globalThis.WebSocket {
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

let websockets: WebSocketSupport | undefined;
