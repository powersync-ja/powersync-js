// The Diagnostics Protocol: the seam between the tool and any SDK, plus the data shapes it carries.
// Owned by the tool; imports nothing from any SDK package.
export * from './shapes.js';
export * from './integration.js';

// Moving an integration across an iframe boundary, and deriving UI state from its events.
export * from './bridge.js';
export * from './store.js';

// Logic every diagnostics host needs on top of the protocol: reading what a Sync Config expects of
// clients, taking bucket names apart, rolling bucket stats up to streams, recovering a session from
// service logs, inferring a schema from the core's observations, and shaping logs for display.
// All of it works on plain protocol data and SQL results, so it too imports no SDK.
export * from './json.js';
export * from './jwt.js';
export * from './log-levels.js';
export * from './sql.js';
export * from './timeout.js';
export * from './tables.js';
export * from './streams.js';
export * from './sync-config.js';
export * from './impersonation.js';
export * from './observed-schema.js';

// The JavaScript agent lives behind the `./js` entrypoint (`@powersync/diagnostics-core/js`), and a
// headless test client for the web behind `./web` (`@powersync/diagnostics-core/web`).
