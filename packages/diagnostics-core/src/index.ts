// The host/inspector side of the Diagnostics Port: the client the UI drives.
export * from './client.js';

// Re-export the Port contract from its home in `@powersync/common` so host consumers import the
// protocol + transport types from one place. The agent is deliberately not re-exported here — it
// runs next to the live client (via `@powersync/common` + a runtime's transport), not in the host.
export * from '@powersync/common/diagnostics/contract';
