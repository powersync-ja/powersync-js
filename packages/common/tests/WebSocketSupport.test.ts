import { describe, expect, test } from 'vitest';
import { AbstractRemote, FetchStrategy } from '../src/index.js';

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
  const remote = new DummyRemote(createSocket);

  return remote.socketStreamRaw({
    path: '',
    data: undefined,
    abortSignal,
    fetchStrategy: FetchStrategy.Buffered
  });
}

describe('WebSocketSupport', () => {
  test('fails the stream when aborted while the socket is still opening', async () => {
    const abort = new AbortController();
    const stream = syncStream(() => new NeverOpeningSocket(), abort.signal);
    abort.abort();

    await expect(stream).rejects.toThrow('Connection request aborted');
  });

  test('fails the stream when the socket closes before it opens', async () => {
    const stream = syncStream(() => new ClosedWhileOpeningSocket(), new AbortController().signal);

    await expect(stream).rejects.toThrow('WebSocket connection closed while opening');
  });
});

class DummyRemote extends AbstractRemote {
  #socketFactory: () => EventTarget;

  constructor(socketFactory: () => EventTarget) {
    super({
      async fetchCredentials() {
        return {
          endpoint: 'http://doesntmatter.powersync.com',
          token: 'foobar'
        };
      }
    });
    this.#socketFactory = socketFactory;
  }

  protected override createSocket(url: string): WebSocket {
    return this.#socketFactory() as unknown as WebSocket;
  }
}
