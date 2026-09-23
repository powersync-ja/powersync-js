/**
 * PowerSync DevTools for a node app: the database lives in this process, so this process hosts the
 * dev server itself. Opens the diagnostics UI on a local port and exposes the MCP tools at `/__mcp`.
 */
import type { McpSetting } from 'devframe';
import { createDevServer } from 'devframe/adapters/dev';
import { createIntegration, type DiagnosableDatabase } from './agent.js';
import { definition, registerIntegration } from './definition.js';

export interface EnableDiagnosticsOptions {
  /** Port for the DevTools window. @default 9999 */
  port?: number;
  /** Bind host. @default '127.0.0.1' */
  host?: string;
  /**
   * Gate the window behind a code printed in the terminal, together with a link that carries it, so
   * opening the link is enough. `false` trusts every local browser. @default true
   */
  auth?: boolean;
  /** Open the browser once the server is up. @default false */
  open?: boolean;
  /** A label for the SDK, shown in the UI. @default '@powersync/node' */
  sdk?: string;
  /** The source id shown in the UI. @default 'node-1' */
  id?: string;
  /**
   * The MCP endpoint at `<url>/__mcp`. By default it mounts once the tools exist and accepts only
   * requests with a loopback `Origin` header; a request without one gets `403`. Pass
   * `{ allowedOrigins: false }` for an MCP client that sends no `Origin` header, `false` to leave
   * the endpoint off, or `{ authorization }` to require a bearer token. @default 'auto'
   */
  mcp?: McpSetting;
}

export interface DiagnosticsServer {
  /** Where the UI is, e.g. `http://localhost:9999`. */
  url: string;
  /** Stops serving and detaches the database. */
  close(): Promise<void>;
}

/**
 * Serves live diagnostics for `db` from this process. Development only: call it behind your own
 * environment check.
 *
 * @example
 * ```ts
 * const db = new PowerSyncDatabase({ ... });
 * if (process.env.NODE_ENV !== 'production') {
 *   const devtools = await enablePowerSyncDiagnostics(db);
 *   console.log(`PowerSync DevTools: ${devtools.url}`);
 * }
 * ```
 */
export async function enablePowerSyncDiagnostics(
  db: DiagnosableDatabase,
  options: EnableDiagnosticsOptions = {}
): Promise<DiagnosticsServer> {
  const sdk = options.sdk ?? '@powersync/node';
  const detach = await registerIntegration(options.id ?? 'node-1', createIntegration(db, sdk), sdk);
  const server = await createDevServer(definition, {
    port: options.port ?? 9999,
    host: options.host,
    auth: options.auth ?? true,
    openBrowser: options.open ?? false,
    mcp: options.mcp ?? 'auto'
  });
  return {
    url: server.origin,
    async close() {
      detach();
      await server.close();
    }
  };
}
