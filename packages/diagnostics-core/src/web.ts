// A headless PowerSync test client for the web, served through the diagnostics protocol
// (`@powersync/diagnostics-core/web`). This entrypoint imports `@powersync/web`: it opens a real
// database, chooses its VFS, and deletes its files. Hosts that inspect an app's own client need
// none of this and should not import it.
export * from './web/session.js';
export * from './web/dev-token-connector.js';
export * from './web/session-identity.js';
export * from './web/delete-database.js';
