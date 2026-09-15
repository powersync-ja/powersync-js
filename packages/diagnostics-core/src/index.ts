// The Diagnostics Protocol: the seam between the tool and any SDK, plus the data shapes it carries.
// Owned by the tool; imports nothing from any SDK package.
export * from './shapes.js';
export * from './integration.js';

// The JavaScript integration (runs in the app page) and the structural database it reads.
export * from './live-database.js';
export * from './agent.js';
export * from './state.js';

// Moving an integration across an iframe boundary, and deriving UI state from its events.
export * from './bridge.js';
export * from './store.js';
