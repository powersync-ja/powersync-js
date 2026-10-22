import net from 'node:net';
import { describe, expect, onTestFinished, vi } from 'vitest';
import { OnExtensionSubscriber, OnNextSubscriber, OnTerminalSubscriber, Payload, RSocketServer } from 'rsocket-core';
import { WebsocketServerTransport } from 'rsocket-websocket-server';

import { SyncStreamConnectionMethod } from '@powersync/common';
import { StreamingSyncLine } from '@powersync/shared-internals/internal/sync_protocol';
import { BSON } from 'bson';
import { checkpoint, createDatabase, TestConnector, tempDirectoryTest } from './utils.js';

type StreamResponder = OnTerminalSubscriber & OnNextSubscriber & OnExtensionSubscriber;

async function findFreePort(): Promise<number> {
  // This is inherently racy, but there's no way to bind RSocket on an arbitrary port and then get the port of a running
  // server. Good enough for tests.
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Starts an RSocket server on localhost, invoking `onRequestStream` for each sync request.
 */
async function startRSocketServer(onRequestStream: (payload: Payload, stream: StreamResponder) => void) {
  const port = await findFreePort();
  const server = new RSocketServer({
    transport: new WebsocketServerTransport({ host: '127.0.0.1', port }),
    acceptor: {
      accept: async () => ({
        requestStream(payload, _initialRequestN, responderStream) {
          onRequestStream(payload, responderStream);
          return {
            request() {},
            cancel() {},
            onExtension() {}
          };
        }
      })
    }
  });

  const closeable = await server.bind();
  onTestFinished(() => closeable.close());
  return { endpoint: `http://127.0.0.1:${port}` };
}

describe('WebSocket sync', () => {
  tempDirectoryTest('reconnects after server completes stream without sending events', async ({ tmpdir }) => {
    const requests: Payload[] = [];
    const { endpoint } = await startRSocketServer((payload, stream) => {
      requests.push(payload);
      if (requests.length == 1) {
        // Close the first stream without sending any events.
        stream.onComplete();
      } else {
        // Afterwards, respond with an empty but complete sync iteration.
        const send = (line: StreamingSyncLine) => stream.onNext({ data: Buffer.from(BSON.serialize(line)) }, false);
        send(checkpoint({ last_op_id: 0 }));
        send({ checkpoint_complete: { last_op_id: '0' } });
      }
    });

    const database = await createDatabase(tmpdir);
    onTestFinished(() => database.close());

    const connector = new TestConnector();
    connector.fetchCredentials = async () => ({ endpoint, token: 'test' });

    database.connect(connector, {
      connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
      retryDelayMs: 100
    });

    // The empty stream should make the client reconnect, after which it can complete a sync.
    await database.waitForFirstSync();
    expect(requests).toHaveLength(2);
  });
});
