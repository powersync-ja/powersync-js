import { LogLevels } from '@powersync/common';
import { describe, expect, test } from 'vitest';
import { WebSocketSupport } from '../../../../src/client/sync/stream/WebSocketSupport.js';
import { AbortOperation } from '../../../../src/utils/AbortOperation.js';
import { EventQueue } from '../../../../src/utils/async.js';

// Like React Native on Android, where closing a socket that is still opening fires no event at all.
class NeverOpeningSocket extends EventTarget {
  readyState = 0;
  binaryType = 'blob';
  close() {}
  send() {}
}

// Like React Native on iOS when the server drops the connection during the handshake: only `close` fires.
class ClosedWhileOpeningSocket extends NeverOpeningSocket {
  constructor() {
    super();
    setTimeout(() => this.dispatchEvent(new Event('close')));
  }
}

function syncStream(createSocket: () => EventTarget, abortSignal: AbortSignal) {
  return new WebSocketSupport({ LogLevels, EventQueue, AbortOperation }).webSocketSyncStream({
    remote: { createSocket, logger: { log() {} } } as any,
    buffered: false,
    abortSignal,
    requestPayload: {},
    request: { url: 'ws://localhost/sync/stream', path: '/sync/stream', userAgent: 'test', headers: {} as any }
  });
}

describe('WebSocketSupport', () => {
  test('fails the stream when aborted while the socket is still opening', async () => {
    const abort = new AbortController();
    const stream = syncStream(() => new NeverOpeningSocket(), abort.signal);
    abort.abort();

    await expect(stream).rejects.toThrow('WebSocket connection closed while opening');
  });

  test('fails the stream when the socket closes before it opens', async () => {
    const stream = syncStream(() => new ClosedWhileOpeningSocket(), new AbortController().signal);

    await expect(stream).rejects.toThrow('WebSocket connection closed while opening');
  });
});
