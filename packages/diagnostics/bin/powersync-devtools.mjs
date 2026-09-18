#!/usr/bin/env node
// PowerSync DevTools as a standalone window (`powersync-devtools`, port 9999) or a static build.
// Databases attach from an app with `connectAgent`; MCP tools are at `<origin>/__mcp`.
import { createCac } from 'devframe/adapters/cac';
import { createInteractiveAuth } from 'devframe/recipes/interactive-auth';
import { definition } from '../lib/src/index.js';

// Flags the CLI adapter does not map itself. They are declared on the definition so `--help` lists
// them, and read here because the adapter only maps `--mcp`/`--no-mcp` and `--no-auth`.
const argv = process.argv;
const readValue = (name) => {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
};

// `--token <secret>`: an app that cannot type the one-time code (a phone, a script) presents this
// pre-shared secret instead. The browser still gets the code prompt.
const token = readValue('--token');
// `--mcp-any-origin`: accept MCP requests without a loopback `Origin` header.
const mcp = argv.includes('--mcp-any-origin') ? { allowedOrigins: false } : undefined;

// The CLI adapter does not forward an `auth` option to the dev server; the server reads the
// definition's `cli.auth` instead, so the token-aware gate is installed there.
if (token) {
  definition.cli.auth = (context) => createInteractiveAuth(context, { clientAuthTokens: [token] });
}

await createCac(definition, {
  ...(mcp ? { mcp } : {}),
  configureCli(cli) {
    // The stdio MCP server runs in its own process with no database attached, so it cannot answer;
    // the HTTP endpoint on the window serves agents instead.
    cli.commands = cli.commands.filter((command) => command.name !== 'mcp');
  }
}).parse();
