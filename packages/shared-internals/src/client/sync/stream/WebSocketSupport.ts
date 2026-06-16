import { FetchStrategy, LogLevels } from '@powersync/common';
import { doneResult, SimpleAsyncIterator, valueResult } from '../../../utils/stream_transform.js';
import { AbstractRemote, PreparedRequest, SocketSyncStreamOptions } from './AbstractRemote.js';
import { Requestable, RSocket, RSocketConnector } from 'rsocket-core';
import { WebsocketClientTransport } from 'rsocket-websocket-client';
import { AbortOperation } from '../../../utils/AbortOperation.js';
import { EventQueue } from '../../../utils/async.js';

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

export async function webSocketSyncStream(
  remote: AbstractRemote,
  options: SocketSyncStreamOptions,
  request: PreparedRequest
): Promise<SimpleAsyncIterator<Uint8Array>> {
  const { path, fetchStrategy = FetchStrategy.Buffered } = options;
  const mimeType = 'application/json';
  const userAgent = request.userAgent;

  function toBuffer(js: any): Buffer {
    return Buffer.from(JSON.stringify(js));
  }

  const syncQueueRequestSize = fetchStrategy == FetchStrategy.Buffered ? 10 : 1;
  const url = request.url.replace(/^https?:\/\//, function (match) {
    return match === 'https://' ? 'wss://' : 'ws://';
  });

  // While we're connecting (a process that can't be aborted in RSocket), the WebSocket instance to close if we wanted
  // to abort the connection.
  let pendingSocket: WebSocket | null = null;
  let keepAliveTimeout: any;
  let rsocket: RSocket | null = null;
  let paused = false;
  const queue = new EventQueue<Uint8Array | null>({
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
  if (options.abortSignal.aborted) {
    throw new AbortOperation('Connection request aborted');
  } else {
    options.abortSignal.addEventListener('abort', abortRequest);
  }

  const resetTimeout = () => {
    clearTimeout(keepAliveTimeout);
    keepAliveTimeout = setTimeout(() => {
      remote.logger.log({
        level: LogLevels.error,
        message: `No data received on WebSocket in ${SOCKET_TIMEOUT_MS}ms, closing connection.`
      });
      abortRequest();
    }, SOCKET_TIMEOUT_MS);
  };
  resetTimeout();

  const connector = new RSocketConnector({
    transport: new WebsocketClientTransport({
      url,
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
    remote.logger.log({ level: LogLevels.error, message: `Failed to connect WebSocket`, error: ex });
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

        const notification = await queue.waitForEvent(options.abortSignal);
        if (didClose) {
          return doneResult;
        } else {
          return valueResult(notification!);
        }
      }
    };

    res = rsocket!.requestStream(
      {
        data: toBuffer(options.data),
        metadata: toBuffer({
          path
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
            remote.logger.log({ level: LogLevels.error, message: 'RSocket error', error: e });
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
