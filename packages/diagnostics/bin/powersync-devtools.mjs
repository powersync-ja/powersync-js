#!/usr/bin/env node
// PowerSync DevTools as a standalone window (`powersync-devtools`, port 9999), a stdio MCP server
// (`powersync-devtools mcp`), or a static build. Databases attach from an app with `connectAgent`.
import { createCac } from 'devframe/adapters/cac';
import { definition } from '../lib/src/index.js';

// The MCP endpoint only accepts requests with a loopback `Origin` header. `--mcp-any-origin` turns
// that check off for MCP clients that send none; the flag is declared on the definition so it
// shows in `--help`, and applied here because the CLI adapter only maps `--mcp`/`--no-mcp` itself.
const mcp = process.argv.includes('--mcp-any-origin') ? { allowedOrigins: false } : undefined;

await createCac(definition, mcp ? { mcp } : {}).parse();
