import type { MessageHandler, Transport, Unsubscribe, WireMessage } from '@powersync/diagnostics-core';

/**
 * An in-memory transport whose `send` is delivered to a paired transport's handlers.
 *
 * Messages are structured-cloned and delivered on a microtask to mimic a real serialization hop,
 * so the playground exercises the same serialize-only contract as a BroadcastChannel or extension bridge.
 */
class LoopbackTransport implements Transport {
  private handlers = new Set<MessageHandler>();
  peer!: LoopbackTransport;

  send(message: WireMessage): void {
    const clone = structuredClone(message);
    queueMicrotask(() => {
      for (const handler of this.peer.handlers) {
        handler(clone);
      }
    });
  }

  onMessage(handler: MessageHandler): Unsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  dispose(): void {
    this.handlers.clear();
  }
}

export function createLoopback(): [Transport, Transport] {
  const a = new LoopbackTransport();
  const b = new LoopbackTransport();
  a.peer = b;
  b.peer = a;
  return [a, b];
}
