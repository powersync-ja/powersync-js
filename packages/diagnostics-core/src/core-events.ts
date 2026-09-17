import type { CoreEventSource } from './agent.js';
import type { CoreDiagnosticsEvent, Unsubscribe } from './shapes.js';

/**
 * The same-origin channel the JavaScript sync client broadcasts core diagnostics events on when
 * connected with `diagnostics: true`. The client may run in a worker; a BroadcastChannel reaches the
 * page either way.
 */
export const CORE_EVENTS_CHANNEL = 'powersync-diagnostics-events';

/** Delivers the core diagnostics events the sync client broadcasts, wherever it runs. */
export class BroadcastCoreEvents implements CoreEventSource {
  private channel = new BroadcastChannel(CORE_EVENTS_CHANNEL);

  onEvent(handler: (event: CoreDiagnosticsEvent) => void): Unsubscribe {
    const listener = (event: MessageEvent) => handler(event.data as CoreDiagnosticsEvent);
    this.channel.addEventListener('message', listener);
    return () => this.channel.removeEventListener('message', listener);
  }

  dispose(): void {
    this.channel.close();
  }
}

/** A core event source for this runtime, or undefined where BroadcastChannel does not exist. */
export const createBroadcastCoreEvents = (): CoreEventSource | undefined =>
  typeof BroadcastChannel === 'function' ? new BroadcastCoreEvents() : undefined;
