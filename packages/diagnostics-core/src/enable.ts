import type { CommonPowerSyncDatabase } from '@powersync/common';
import { DiagnosticsAgent, DiagnosticsAgentOptions } from './agent.js';
import { BroadcastChannelTransport } from './transport.js';

export interface EnableDiagnosticsOptions extends DiagnosticsAgentOptions {
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
  const agent = new DiagnosticsAgent(db, new BroadcastChannelTransport(channelName), agentOptions);
  agent.start();
  return agent;
}
