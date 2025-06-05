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
import { Dispatcher, EnvHttpProxyAgent, ErrorEvent, WebSocket as UndiciWebSocket } from 'undici';
import { ErrorRecordingDispatcher } from './ErrorRecordingDispatcher.js';

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
  private dispatcher: Dispatcher;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<NodeRemoteOptions>
  ) {
    // EnvHttpProxyAgent automatically uses relevant env vars for HTTP
    const dispatcher = options?.dispatcher ?? new EnvHttpProxyAgent();

    super(connector, logger, {
      fetchImplementation: options?.fetchImplementation ?? new NodeFetchProvider(),
      fetchOptions: {
        dispatcher
      },
      ...(options ?? {})
    });

    this.dispatcher = dispatcher;
  }

  protected createSocket(url: string): globalThis.WebSocket {
    // Create dedicated dispatcher for this WebSocket
    let ws: UndiciWebSocket | undefined;
    const onError = (error: Error) => {
      // When we receive an error from the Dispatcher, emit the event on the websocket.
      // This will take precedence over the WebSocket's own error event, giving more details on what went wrong.
      const event = new ErrorEvent('error', {
        error,
        message: error.message
      });
      ws?.dispatchEvent(event);
    };

    const errorRecordingDispatcher = new ErrorRecordingDispatcher(this.dispatcher, onError);

    // Create WebSocket with dedicated dispatcher
    ws = new UndiciWebSocket(url, {
      dispatcher: errorRecordingDispatcher,
      headers: {
        'User-Agent': this.getUserAgent()
      }
    });

    return ws as globalThis.WebSocket;
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
