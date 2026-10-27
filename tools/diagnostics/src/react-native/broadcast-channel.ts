type MessageListener = (event: { data: unknown }) => void;

const channelsByName = new Map<string, Set<InMemoryBroadcastChannel>>();

/**
 * A `BroadcastChannel` for one JavaScript realm. Hermes has none; the React Native sync client posts
 * core diagnostics events on one, and the agent listens on another with the same name.
 */
class InMemoryBroadcastChannel {
  onmessage: MessageListener | null = null;
  private readonly listeners = new Set<MessageListener>();
  private closed = false;

  constructor(readonly name: string) {
    let channels = channelsByName.get(name);
    if (!channels) {
      channels = new Set();
      channelsByName.set(name, channels);
    }
    channels.add(this);
  }

  postMessage(data: unknown): void {
    if (this.closed) return;
    for (const channel of channelsByName.get(this.name) ?? []) {
      if (channel !== this) {
        // Asynchronous, like the platform API.
        setTimeout(() => channel.deliver(data), 0);
      }
    }
  }

  addEventListener(type: string, listener: MessageListener): void {
    if (type === 'message') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: MessageListener): void {
    if (type === 'message') this.listeners.delete(listener);
  }

  close(): void {
    this.closed = true;
    this.listeners.clear();
    channelsByName.get(this.name)?.delete(this);
  }

  private deliver(data: unknown): void {
    if (this.closed) return;
    const event = { data };
    this.onmessage?.(event);
    for (const listener of this.listeners) listener(event);
  }
}

/** Installs the in-memory channel when the runtime has no `BroadcastChannel`. */
export function ensureBroadcastChannel(): void {
  const scope = globalThis as { BroadcastChannel?: unknown };
  if (typeof scope.BroadcastChannel !== 'function') {
    scope.BroadcastChannel = InMemoryBroadcastChannel;
  }
}
