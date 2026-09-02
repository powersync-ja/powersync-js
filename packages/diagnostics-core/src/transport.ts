import { DEFAULT_CHANNEL_NAME, Unsubscribe, WireMessage } from './protocol.js';

export type MessageHandler = (message: WireMessage) => void;

/** A duplex message channel carrying the Diagnostics Port protocol. */
export interface Transport {
  send(message: WireMessage): void;
  /** Register a handler for inbound messages; returns a disposer. */
  onMessage(handler: MessageHandler): Unsubscribe;
  dispose(): void;
}

/**
 * Transport over a same-origin `BroadcastChannel`.
 *
 * Used for the Nuxt DevTools boundary: the app registers the agent on its real client in the top
 * window, and the DevTools iframe hosts the UI — two JS realms on the same origin that coordinate
 * purely by posting serialized messages.
 */
export class BroadcastChannelTransport implements Transport {
  private channel: BroadcastChannel;
  private handlers = new Set<MessageHandler>();

  constructor(name: string = DEFAULT_CHANNEL_NAME) {
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = (event: MessageEvent) => {
      const message = event.data as WireMessage;
      for (const handler of this.handlers) {
        handler(message);
      }
    };
  }

  send(message: WireMessage): void {
    this.channel.postMessage(message);
  }

  onMessage(handler: MessageHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  dispose(): void {
    this.handlers.clear();
    this.channel.close();
  }
}
