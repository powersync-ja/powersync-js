import {
  DEFAULT_CHANNEL_NAME,
  MessageHandler,
  Transport,
  Unsubscribe,
  WireMessage
} from '@powersync/common/diagnostics/contract';

/**
 * Diagnostics transport over a same-origin `BroadcastChannel`.
 *
 * Used for the same-origin boundary (e.g. the Nuxt DevTools iframe): the app registers the agent on
 * its real client in the top window, and the DevTools iframe hosts the UI — two JS realms on the
 * same origin that coordinate purely by posting serialized messages.
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
