import { Unsubscribe } from './protocol.js';

/**
 * The slice of the core diagnostics event stream the agent consumes.
 *
 * Mirrors the SDK's full-fidelity core diagnostics event (per-bucket `target_count` + inferred
 * schema); typed narrowly here so the agent depends only on what it reads, keeping it free of any
 * particular runtime's event-delivery mechanism.
 */
export type CoreDiagnosticsEvent =
  | { BucketStateChange: { changes: { name: string; progress: { target_count: number } }[]; incremental?: boolean } }
  | { SchemaChange: unknown };

/**
 * Delivers core diagnostics events to the agent.
 *
 * How the events actually reach the agent is environment-specific — a same-origin BroadcastChannel
 * from a shared worker on the web, an in-process observer on other runtimes — so the source is
 * injected rather than opened by the agent itself.
 */
export interface DiagnosticsEventSource {
  onEvent(handler: (event: CoreDiagnosticsEvent) => void): Unsubscribe;
  dispose(): void;
}
