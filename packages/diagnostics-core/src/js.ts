// The JavaScript implementation of the protocol: the agent that runs next to a live JS database, the
// structural database interface it reads, the status mapping, and the source of core diagnostics
// events the JS sync client broadcasts. Only JavaScript hosts need this entrypoint
// (`@powersync/diagnostics-core/js`); the protocol itself is the package's main export.
export * from './live-database.js';
export * from './agent.js';
export * from './state.js';
export * from './core-events.js';
