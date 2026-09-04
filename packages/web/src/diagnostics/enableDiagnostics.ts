import type { CommonPowerSyncDatabase } from '@powersync/common';
import { DiagnosticsAgent, DiagnosticsAgentOptions } from '@powersync/common/diagnostics';
import { BroadcastChannelEventSource } from './BroadcastChannelEventSource.js';
import { BroadcastChannelTransport } from './BroadcastChannelTransport.js';

export interface EnableDiagnosticsOptions extends Omit<DiagnosticsAgentOptions, 'eventSource'> {
  /** The same-origin BroadcastChannel name the DevTools/extension client connects on. */
  channelName?: string;
}

/**
 * Attaches a diagnostics agent to a live PowerSync client so a DevTools panel or browser extension
 * can inspect it over a same-origin BroadcastChannel. Call once, after the database is created.
 *
 * Combine with `connect(connector, { diagnostics: true })` to also enable the core diagnostics
 * event stream (per-bucket download stats + inferred schema).
 *
 * @example
 * ```typescript
 * const db = new PowerSyncDatabase({ ... });
 * if (import.meta.env.DEV) enableDiagnostics(db);
 * ```
 *
 * @returns the running agent; call `stop()` on it to detach.
 */
export function enableDiagnostics(
  db: CommonPowerSyncDatabase,
  options: EnableDiagnosticsOptions = {}
): DiagnosticsAgent {
  const { channelName, ...agentOptions } = options;
  const agent = new DiagnosticsAgent(db, new BroadcastChannelTransport(channelName), {
    ...agentOptions,
    eventSource: new BroadcastChannelEventSource()
  });
  agent.start();
  return agent;
}
