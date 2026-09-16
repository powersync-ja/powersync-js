// The Diagnostics Protocol: the seam between the tool and any SDK, plus the data shapes it carries.
// Owned by the tool; imports nothing from any SDK package.
export * from './shapes.js';
export * from './integration.js';

// Moving an integration across an iframe boundary, and deriving UI state from its events.
export * from './bridge.js';
export * from './store.js';

// The JavaScript agent lives behind the `./js` entrypoint (`@powersync/diagnostics-core/js`).
