import { CoreDiagnosticsEvent, DiagnosticsEventSource, Unsubscribe } from '@powersync/common/diagnostics/contract';

/** The channel the SDK's sync implementation broadcasts core diagnostics events on. */
const DIAGNOSTICS_EVENT_CHANNEL = 'powersync-diagnostics-events';

/**
 * Delivers core diagnostics events to the agent over a same-origin `BroadcastChannel`.
 *
 * The SDK's sync implementation broadcasts each core diagnostics event on this channel, which
 * reaches the page even when sync runs in a shared worker. A no-op where BroadcastChannel is
 * unavailable.
 */
export class BroadcastChannelEventSource implements DiagnosticsEventSource {
  private channel: BroadcastChannel | null =
    typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(DIAGNOSTICS_EVENT_CHANNEL);

  onEvent(handler: (event: CoreDiagnosticsEvent) => void): Unsubscribe {
    const channel = this.channel;
    if (!channel) {
      return () => {};
    }
    const listener = (event: MessageEvent) => handler(event.data as CoreDiagnosticsEvent);
    channel.addEventListener('message', listener);
    return () => channel.removeEventListener('message', listener);
  }

  dispose(): void {
    this.channel?.close();
    this.channel = null;
  }
}
