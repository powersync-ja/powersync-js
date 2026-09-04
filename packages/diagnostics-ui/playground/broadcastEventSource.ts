import type { CoreDiagnosticsEvent, DiagnosticsEventSource, Unsubscribe } from '@powersync/common/diagnostics/contract';

/**
 * Playground event source: consumes the diagnostics events the mock database broadcasts, mirroring
 * `@powersync/web`'s `BroadcastChannelEventSource` without pulling the full web SDK into the harness.
 */
export class BroadcastEventSource implements DiagnosticsEventSource {
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
