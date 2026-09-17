/**
 * The route the diagnostics UI is served from. It is the devframe mount base of the `powersync`
 * definition (`/__<id>/`), and the same path `./vite-static` serves for hosts without a devframe hub,
 * so an embedding host can point an iframe at it either way.
 */
export const UI_ROUTE = '/__powersync/';

/** The devframe definition id. RPC functions live in this scope: `powersync:<name>`. */
export const DEVFRAME_ID = 'powersync';
