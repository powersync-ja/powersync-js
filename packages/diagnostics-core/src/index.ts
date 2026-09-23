// The Diagnostics Protocol: the seam between the tool and any SDK, plus the data shapes it carries.
// Owned by the tool; imports nothing from any SDK package.
export * from './shapes.js';
export * from './integration.js';

// Moving an integration across an iframe boundary.
export * from './bridge.js';
