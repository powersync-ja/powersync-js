import { Unsubscribe, WireMessage } from './protocol.js';

export type MessageHandler = (message: WireMessage) => void;

/**
 * A duplex message channel carrying the Diagnostics Port protocol.
 *
 * The only per-environment part of the stack: a concrete transport is supplied by whoever hosts the
 * agent or client (e.g. a same-origin BroadcastChannel in `@powersync/web`, an extension message
 * bridge, or a VM-service channel). The agent and client know only this interface.
 */
export interface Transport {
  send(message: WireMessage): void;
  /** Register a handler for inbound messages; returns a disposer. */
  onMessage(handler: MessageHandler): Unsubscribe;
  dispose(): void;
}
