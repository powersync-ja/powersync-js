/**
 * Adapted from rsocket-websocket-client
 * https://github.com/rsocket/rsocket-js/blob/e224cf379e747c4f1ddc4f2fa111854626cc8575/packages/rsocket-websocket-client/src/WebsocketClientTransport.ts#L17
 * This adds additional error handling for React Native iOS.
 * This particularly adds a close listener to handle cases where the WebSocket
 * connection closes immediately after opening without emitting an error.
 */
import {
  ClientTransport,
  Closeable,
  Demultiplexer,
  Deserializer,
  DuplexConnection,
  FrameHandler,
  Multiplexer,
  Outbound
} from 'rsocket-core';
import { ClientOptions } from 'rsocket-websocket-client';
import { WebsocketDuplexConnection } from 'rsocket-websocket-client/dist/WebsocketDuplexConnection.js';

export class WebsocketClientTransport implements ClientTransport {
  private readonly url: string;
  private readonly factory: (url: string) => WebSocket;

  constructor(options: ClientOptions) {
    this.url = options.url;
    this.factory = options.wsCreator ?? ((url: string) => new WebSocket(url));
  }

  connect(
    multiplexerDemultiplexerFactory: (outbound: Outbound & Closeable) => Multiplexer & Demultiplexer & FrameHandler
  ): Promise<DuplexConnection> {
    return new Promise((resolve, reject) => {
      const websocket = this.factory(this.url);

      websocket.binaryType = 'arraybuffer';

      let removeListeners: () => void;

      const openListener = () => {
        removeListeners();
        resolve(new WebsocketDuplexConnection(websocket, new Deserializer(), multiplexerDemultiplexerFactory));
      };

      const errorListener = (ev: ErrorEvent) => {
        removeListeners();
        // We add a default error in that case.
        if (ev.error != null) {
          // undici typically provides an error object
          reject(ev.error);
        } else if (ev.message != null) {
          // React Native typically does not provide an error object, but does provide a message
          reject(new Error(`Failed to create websocket connection: ${ev.message}`));
        } else {
          // Browsers often provide no details at all
          reject(new Error(`Failed to create websocket connection to ${this.url}`));
        }
      };

      /**
       * In some cases, such as React Native iOS, the WebSocket connection may close immediately after opening
       * without and error. In such cases, we need to handle the close event to reject the promise.
       */
      const closeListener = () => {
        removeListeners();
        reject(new Error('WebSocket connection closed while opening'));
      };

      removeListeners = () => {
        websocket.removeEventListener('open', openListener);
        websocket.removeEventListener('error', errorListener);
        websocket.removeEventListener('close', closeListener);
      };

      websocket.addEventListener('open', openListener);
      websocket.addEventListener('error', errorListener);
      websocket.addEventListener('close', closeListener);
    });
  }
}
