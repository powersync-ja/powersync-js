#!/usr/bin/env node
// PowerSync DevTools as a standalone window (`powersync-devtools`, port 9999), a stdio MCP server
// (`powersync-devtools mcp`), or a static build. Databases attach from an app with `connectAgent`.
import { createCac } from 'devframe/adapters/cac';
import { definition } from '../lib/src/index.js';

await createCac(definition).parse();
