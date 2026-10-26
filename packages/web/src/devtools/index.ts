/**
 * Development-tooling entry point (`@powersync/web/devtools`).
 *
 * Kept off the main index so the public API of `@powersync/web` is unchanged; tooling imports this
 * subpath explicitly.
 */
export { getRegisteredDatabases, observeRegisteredDatabases } from './registry.js';
