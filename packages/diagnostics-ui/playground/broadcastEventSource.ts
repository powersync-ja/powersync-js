import type { CoreDiagnosticsEvent, Unsubscribe } from '@powersync/diagnostics-core';
import type { CoreEventSource } from '@powersync/diagnostics-core/js';

/**
 * Playground event source: consumes the core diagnostics events the mock database broadcasts, the way
 * a web runtime would consume events from the sync worker.
 */
export class BroadcastEventSource implements CoreEventSource {
  private channel = new BroadcastChannel('powersync-diagnostics-events');

  onEvent(handler: (event: CoreDiagnosticsEvent) => void): Unsubscribe {
    const listener = (event: MessageEvent) => handler(event.data as CoreDiagnosticsEvent);
    this.channel.addEventListener('message', listener);
    return () => this.channel.removeEventListener('message', listener);
  }

  dispose(): void {
    this.channel.close();
  }
}
