// Note: This file gets bundled as a lazy import, along with all of its dependencies. For this reason, only use type
// imports and let a caller provide the implementation.
// An exception is RSocket, which we explicitly want to bundle into this file.
import type { LogLevels } from '@powersync/common';
import type { AbstractRemote, PreparedRequest } from './AbstractRemote.js';
import type { EventQueue } from '../../../utils/async.js';
import type { AbortOperation } from '../../../utils/AbortOperation.js';

// doneResult and valueResult are tiny definitions we can afford to duplicate.
import { doneResult, type SimpleAsyncIterator, valueResult } from '../../../utils/stream_transform.js';
import { Requestable, RSocket, RSocketConnector } from 'rsocket-core';
import { WebsocketClientTransport } from 'rsocket-websocket-client';

const SYNC_QUEUE_REQUEST_HIGH_WATER = 10;
const SYNC_QUEUE_REQUEST_LOW_WATER = 5;

// Keep alive message is sent every period
const KEEP_ALIVE_MS = 20_000;

// One message of any type must be received in this period.
const SOCKET_TIMEOUT_MS = 30_000;

// One keepalive message must be received in this period.
// If there is a backlog of messages (for example on slow connections), keepalive messages could be delayed
// significantly. Therefore this is longer than the socket timeout.
const KEEP_ALIVE_LIFETIME_MS = 90_000;

/**
 * Symbols from the main module used in WebSockets too. We're passing those from the main module to avoid bundling them
 * again.
 */
export interface WebSocketSyncStreamPlatform {
  LogLevels: typeof LogLevels;
  EventQueue: typeof EventQueue;
  AbortOperation: typeof AbortOperation;
}

export interface WebSocketSyncStreamOptions {
  remote: AbstractRemote;
  buffered: boolean;
  abortSignal: AbortSignal;
  requestPayload: unknown;
  request: PreparedRequest;
}

export class WebSocketSupport {
  #platform: WebSocketSyncStreamPlatform;

  constructor(platform: WebSocketSyncStreamPlatform) {
    this.#platform = platform;
  }

  async webSocketSyncStream({
    remote,
    buffered,
    request,
    abortSignal,
    requestPayload
  }: WebSocketSyncStreamOptions): Promise<SimpleAsyncIterator<Uint8Array>> {
    const mimeType = 'application/json';
    const userAgent = request.userAgent;

    function toBuffer(js: any): Buffer {
      return Buffer.from(JSON.stringify(js));
    }

    const syncQueueRequestSize = buffered ? 10 : 1;

    // While we're connecting (a process that can't be aborted in RSocket), the WebSocket instance to close if we wanted
    // to abort the connection.
    let pendingSocket: WebSocket | null = null;
    let keepAliveTimeout: any;
    let rsocket: RSocket | null = null;
    let paused = false;
    const queue = new this.#platform.EventQueue<Uint8Array | null>({
      eventDelivered: () => {
        if (queue.countOutstandingEvents <= SYNC_QUEUE_REQUEST_LOW_WATER) {
          paused = false;
          requestMore();
        }
      }
    });
    let didClose = false;
    let connectionEstablished = false;
    let pendingEventsCount = syncQueueRequestSize;
    let res: Requestable | null = null;

    const abortRequest = () => {
      if (didClose) {
        return;
      }
      didClose = true;

      clearTimeout(keepAliveTimeout);

      if (pendingSocket) {
        pendingSocket.close();
      }

      if (rsocket) {
        rsocket.close();
      }

      // Send a bogus event to the queue to ensure a pending listener gets woken up. We check for didClose and would
      // return a doneEvent.
      queue.notify(null);
    };

    function push(event: Uint8Array) {
      queue.notify(event);
      if (queue.countOutstandingEvents >= SYNC_QUEUE_REQUEST_HIGH_WATER) {
        paused = true;
      }
    }

    function requestMore() {
      const delta = syncQueueRequestSize - pendingEventsCount;
      if (!paused && delta > 0) {
        res?.request(delta);
        pendingEventsCount = syncQueueRequestSize;
      }
    }

    // Handle upstream abort
    if (abortSignal.aborted) {
      throw new this.#platform.AbortOperation('Connection request aborted');
    } else {
      abortSignal.addEventListener('abort', abortRequest);
    }

    const resetTimeout = () => {
      clearTimeout(keepAliveTimeout);
      keepAliveTimeout = setTimeout(() => {
        remote.logger.log({
          level: this.#platform.LogLevels.error,
          message: `No data received on WebSocket in ${SOCKET_TIMEOUT_MS}ms, closing connection.`
        });
        abortRequest();
      }, SOCKET_TIMEOUT_MS);
    };
    resetTimeout();

    const connector = new RSocketConnector({
      transport: new WebsocketClientTransport({
        url: request.url,
        wsCreator: (url) => {
          const socket = (pendingSocket = remote.createSocket(url));

          socket.addEventListener('message', () => {
            resetTimeout();
          });
          return socket;
        }
      }),
      setup: {
        keepAlive: KEEP_ALIVE_MS,
        lifetime: KEEP_ALIVE_LIFETIME_MS,
        dataMimeType: mimeType,
        metadataMimeType: mimeType,
        payload: {
          data: null,
          metadata: toBuffer({
            token: request.headers.Authorization,
            user_agent: userAgent
          })
        }
      }
    });

    try {
      rsocket = await connector.connect();
      // The connection is established, we no longer need to monitor the initial timeout
      pendingSocket = null;
    } catch (ex) {
      remote.logger.log({ level: this.#platform.LogLevels.error, message: `Failed to connect WebSocket`, error: ex });
      abortRequest();

      throw ex;
    }

    resetTimeout();

    // Helps to prevent double close scenarios
    rsocket.onClose(() => (rsocket = null));

    return await new Promise((resolve, reject) => {
      const queueAsIterator: SimpleAsyncIterator<Uint8Array> = {
        next: async () => {
          if (didClose) return doneResult;

          const notification = await queue.waitForEvent(abortSignal);
          if (didClose) {
            return doneResult;
          } else {
            return valueResult(notification!);
          }
        }
      };

      res = rsocket!.requestStream(
        {
          data: toBuffer(requestPayload),
          metadata: toBuffer({
            path: request.path
          })
        },
        syncQueueRequestSize, // The initial N amount
        {
          onError: (e) => {
            if (e.message.includes('PSYNC_')) {
              if (e.message.includes('PSYNC_S21')) {
                remote.invalidateCredentials();
              }
            } else {
              // Possible that connection is with an older service, always invalidate to be safe
              if (e.message !== 'Closed. ') {
                remote.invalidateCredentials();
              }
            }

            // Don't log closed as an error
            if (e.message !== 'Closed. ') {
              remote.logger.log({ level: this.#platform.LogLevels.error, message: 'RSocket error', error: e });
            }
            // RSocket will close the RSocket stream automatically
            // Close the downstream stream as well - this will close the RSocket connection and WebSocket
            abortRequest();
            // Handles cases where the connection failed e.g. auth error or connection error
            if (!connectionEstablished) {
              reject(e);
            }
          },
          onNext: (payload) => {
            // The connection is active
            if (!connectionEstablished) {
              connectionEstablished = true;
              resolve(queueAsIterator);
            }
            const { data } = payload;

            if (data) {
              push(data);
            }

            // Less events are now pending
            pendingEventsCount--;

            // Request another event (unless the downstream consumer is paused).
            requestMore();
          },
          onComplete: () => {
            abortRequest(); // this will also emit a done event
          },
          onExtension: () => {}
        }
      );
    });
  }
}
