import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineNuxtModule, createResolver, addPlugin, addImports, addVitePlugin, findPath } from '@nuxt/kit';
import type { Nuxt } from 'nuxt/schema';
import { defu } from 'defu';
import { DEVTOOLS_THEME_SCRIPT, setupDevToolsUI } from './devtools';
import type { PowerSyncRuntimeOptions } from './runtime/options';
import { addImportsFrom } from './runtime/utils/addImportsFrom';

/**
 * Configuration options for the PowerSync Nuxt module.
 *
 * @example
 * ```typescript
 * export default defineNuxtConfig({
 *   modules: ['@powersync/nuxt'],
 *   powersync: {
 *     useDiagnostics: true,
 *   },
 * })
 * ```
 */
export interface PowerSyncNuxtModuleOptions {
  /**
   * Enable the PowerSync diagnostics tab in Nuxt DevTools.
   *
   * When `true`, the module loads the diagnostics agent into the app during `nuxt dev`, serves the
   * diagnostics UI, and registers the DevTools tab. Nothing is added to a production build. Pass
   * `{ diagnostics: true }` to `connect()` as well to get per-bucket totals from the SQLite core.
   *
   * @default false
   */
  useDiagnostics?: boolean;
  /**
   * Enable Kysely integration.
   *
   * When set to `true`, enables the `usePowerSyncKysely` composable for type-safe database queries.
   * Requires `@powersync/kysely-driver` to be installed.
   *
   * @default false
   */
  kysely?: boolean;
}

export default defineNuxtModule<PowerSyncNuxtModuleOptions>({
  meta: {
    name: 'powersync-nuxt',
    configKey: 'powersync'
  },
  // Default configuration options of the Nuxt module
  defaults: {
    useDiagnostics: false,
    kysely: false
  },
  moduleDependencies: {
    '@vueuse/nuxt': {}
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    // Nuxt installs its own modules (DevTools among them) after the app's, so the version is read once
    // every module has run. Both consumers below fire later than that.
    const runtimeOptions = (nuxt.options.runtimeConfig.public.powerSyncModuleOptions ??= {}) as PowerSyncRuntimeOptions;
    nuxt.hook('modules:done', async () => {
      const devtoolsMajor = nuxtDevtoolsMajor(nuxt);
      runtimeOptions.diagnosticsTransport = devtoolsMajor >= 4 ? 'devframe' : 'page';
      if (!options.useDiagnostics || !nuxt.options.dev) return;
      // Diagnostics during development, by Nuxt DevTools generation. Added as Vite plugins through the
      // kit so the same code works on Nuxt 4 (separate client and server Vite configs) and Nuxt 5 (one
      // Vite server with environments). Registered for every environment: a client-only plugin is
      // wrapped by the kit under the environment API, which hides its `devtools` hook from Vite
      // DevTools and drops `configureServer`. Both plugins are serve-only and skip the server side.
      if (devtoolsMajor >= 4) {
        // Nuxt DevTools 4 runs on Vite DevTools: mount the devframe definition. The dock, the page
        // script and the MCP tools come with it.
        const { default: powersyncDevtools } = await import('@powersync/diagnostics/vite');
        addVitePlugin(powersyncDevtools());
      } else {
        // Nuxt DevTools 3 has no devframe hub: serve the UI as a static page for the custom tab. The
        // runtime plugin loads the page agent that answers the tab over postMessage.
        const { default: powersyncStatic } = await import('@powersync/diagnostics/vite-static');
        addVitePlugin(powersyncStatic({ scripts: [DEVTOOLS_THEME_SCRIPT] }));
        setupDevToolsUI(nuxt);
      }
    });

    // Filled in place, so the `modules:done` hook above writes into the same object.
    Object.assign(
      runtimeOptions,
      defu(runtimeOptions, {
        useDiagnostics: options.useDiagnostics,
        // Set in `modules:done`, once the Nuxt DevTools generation is known.
        diagnosticsTransport: 'page',
        kysely: options.kysely
      } satisfies PowerSyncRuntimeOptions)
    );

    if (options.kysely) {
      const kyselyDriverPath = await findPath('@powersync/kysely-driver');

      if (!kyselyDriverPath) {
        throw new Error(
          '[@powersync/nuxt] The `kysely` option requires @powersync/kysely-driver to be installed.\n' +
            'Run: npm install @powersync/kysely-driver'
        );
      }
    }

    addPlugin(resolver.resolve('./runtime/plugin.client'));

    // Conditionally add Kysely composable if enabled
    if (options.kysely) {
      addImports({
        name: 'usePowerSyncKysely',
        from: resolver.resolve('./runtime/composables/usePowerSyncKysely')
      });
    }

    addImports({
      name: 'useDiagnosticsLogger',
      from: resolver.resolve('./runtime/composables/useDiagnosticsLogger')
    });

    addImportsFrom(
      [
        'createPowerSyncPlugin',
        'providePowerSync',
        'usePowerSync',
        'useQuery',
        'useStatus',
        'useWatchedQuerySubscription',
        'useSyncStream',
        {
          name: 'AdditionalOptions',
          type: true
        }
      ],
      '@powersync/vue'
    );

    // Ensure the packages are transpiled
    nuxt.options.build.transpile = nuxt.options.build.transpile || [];
    nuxt.options.build.transpile.push('@powersync/web', '@journeyapps/wa-sqlite');

    // Conditionally add Kysely driver to transpile list if enabled
    if (options.kysely) {
      nuxt.options.build.transpile.push('@powersync/kysely-driver');
    }

    nuxt.hooks.hook('prepare:types', ({ references }: { references: any[] }) => {
      references.push({ types: '@powersync/web' });
      references.push({ types: '@journeyapps/wa-sqlite' });

      // Conditionally add Kysely types if enabled
      if (options.kysely) {
        references.push({ types: '@powersync/kysely-driver' });
      }
    });

    // Make assets available to runtime files via Vite resolve alias
    // Configure Vite to resolve ./assets/* imports from the layout to the module's assets directory
    // This allows: import iconUrl from './assets/powersync-icon.svg?url'
    const assetsDir = resolver.resolve('./runtime/assets');

    nuxt.options.vite = nuxt.options.vite || {};
    nuxt.options.vite.resolve = nuxt.options.vite.resolve || {};

    const existingAlias = nuxt.options.vite.resolve.alias || [];
    const aliasArray = Array.isArray(existingAlias)
      ? [...existingAlias]
      : Object.entries(existingAlias).map(([find, replacement]) => ({
          find,
          replacement: replacement as string
        }));

    // Add alias for assets directory - matches ./assets/* pattern from layout files
    aliasArray.push({
      find: /^\.\/assets\/(.+)$/,
      replacement: `${assetsDir}/$1`
    });

    nuxt.options.vite.resolve.alias = aliasArray;

    // Serve the tab icon for Nuxt DevTools at /assets/powersync-icon.svg (dev-server middleware only).
    const assetPath = resolver.resolve('./runtime/assets/powersync-icon.svg');
    addVitePlugin({
      name: 'powersync-assets',
      apply: 'serve',
      configureServer(server: any) {
        server.middlewares.use('/assets/powersync-icon.svg', (_request: any, response: any, next: any) => {
          try {
            response.setHeader('Content-Type', 'image/svg+xml');
            response.end(readFileSync(assetPath));
          } catch {
            next();
          }
        });
      }
    });
  }
});

const DEVTOOLS_MODULES = ['@nuxt/devtools', '@nuxt/devtools-nightly', '@nuxt/devtools-edge'];

/**
 * The major version of the Nuxt DevTools module installed in the app. Read from Nuxt's record of
 * installed modules (valid after `modules:done`), else from the package the app resolves; 3 when
 * neither is available.
 */
function nuxtDevtoolsMajor(nuxt: Nuxt): number {
  const installed = nuxt.options._installedModules.find((entry) => DEVTOOLS_MODULES.includes(entry.meta?.name ?? ''));
  const fromMeta = installed?.meta?.version;
  if (fromMeta) return Number(fromMeta.split('.')[0]) || 3;
  try {
    // Resolve from where the module was loaded, else from the app root.
    const from = installed?.entryPath
      ? join(dirname(installed.entryPath), 'package.json')
      : join(nuxt.options.rootDir, 'package.json');
    const pkg = createRequire(from)('@nuxt/devtools/package.json') as { version: string };
    return Number(pkg.version.split('.')[0]) || 3;
  } catch {
    return 3;
  }
}
