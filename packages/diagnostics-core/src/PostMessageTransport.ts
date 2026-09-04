import type { MessageHandler, Transport, Unsubscribe, WireMessage } from '@powersync/common/diagnostics/contract';

/** Tag distinguishing diagnostics wire messages from other `postMessage` traffic on the window. */
const ENVELOPE_TAG = 'powersync-diagnostics';

interface PostMessageEnvelope {
  __tag: typeof ENVELOPE_TAG;
  msg: WireMessage;
}

function isEnvelope(data: unknown): data is PostMessageEnvelope {
  return typeof data === 'object' && data !== null && (data as PostMessageEnvelope).__tag === ENVELOPE_TAG;
}

/**
 * Host transport for an embedded diagnostics UI, over `window.postMessage`.
 *
 * When the UI runs in an iframe (e.g. embedded in a Flutter DevTools extension or any other host),
 * it posts wire messages to its parent window; the embedder relays them to the agent over whatever
 * real channel it has (a VM-service extension, a chrome bridge, a WebSocket). The embedder posts
 * agent messages back onto the iframe's window, where this transport picks them up.
 *
 * @param target - the window to post to (defaults to the parent frame).
 * @param targetOrigin - the `postMessage` target origin (defaults to `'*'`; set it when the embedder origin is known).
 */
export class PostMessageTransport implements Transport {
  private handlers = new Set<MessageHandler>();
  private readonly listener: (event: MessageEvent) => void;

  constructor(
    private target: Window = window.parent,
    private targetOrigin: string = '*'
  ) {
    this.listener = (event: MessageEvent) => {
      if (!isEnvelope(event.data)) {
        return;
      }
      for (const handler of this.handlers) {
        handler(event.data.msg);
      }
    };
    window.addEventListener('message', this.listener);
  }

  send(message: WireMessage): void {
    this.target.postMessage({ __tag: ENVELOPE_TAG, msg: message } satisfies PostMessageEnvelope, this.targetOrigin);
  }

  onMessage(handler: MessageHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  dispose(): void {
    window.removeEventListener('message', this.listener);
    this.handlers.clear();
  }
}
