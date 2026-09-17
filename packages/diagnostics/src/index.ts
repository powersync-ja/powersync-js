// The PowerSync devframe definition and the node-side registry of served databases.
// Hosts mount it: `./vite` (Vite DevTools dock), `./node` (a node app's dev server), the
// `powersync-devtools` bin (standalone window and stdio MCP).
import './rpc-types.js';

export { definition, registerIntegration, uiDistDir } from './definition.js';
export type { SourceInfo } from './rpc-types.js';
export { UI_ROUTE, DEVFRAME_ID } from './constants.js';
