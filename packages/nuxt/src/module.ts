import {
  defineNuxtModule,
  createResolver,
  addPlugin,
  addImports,
  extendPages,
  addLayout,
  addComponentsDir,
  findPath
} from '@nuxt/kit';
import { defu } from 'defu';
import { setupDevToolsUI } from './devtools';
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
   * Enable diagnostics and the PowerSync Inspector.
   *
   * When set to `true`, enables diagnostics recording and makes the PowerSync Inspector available.
   * The inspector provides real-time monitoring, data inspection, and debugging tools.
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
    '@nuxt/devtools-ui-kit': {},
    '@vueuse/nuxt': {}
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.public.powerSyncModuleOptions = defu(
      nuxt.options.runtimeConfig.public.powerSyncModuleOptions as any,
      {
        useDiagnostics: options.useDiagnostics,
        kysely: options.kysely
      }
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

    // expose the composables
    addImports({
      name: 'NuxtPowerSyncDatabase',
      from: resolver.resolve('./runtime/utils/NuxtPowerSyncDatabase')
    });

    addImports({
      name: 'usePowerSyncInspector',
      from: resolver.resolve('./runtime/composables/usePowerSyncInspector')
    });

    addImports({
      name: 'usePowerSyncInspectorDiagnostics',
      from: resolver.resolve('./runtime/composables/usePowerSyncInspectorDiagnostics')
    });

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

    // From the runtime directory
    addComponentsDir({
      path: resolver.resolve('runtime/components')
    });

    addLayout(resolver.resolve('./runtime/layouts/powersync-inspector-layout.vue'), 'powersync-inspector-layout');

    extendPages((pages) => {
      pages.push({
        path: '/__powersync-inspector',
        // file: resolver.resolve("#build/pages/__powersync-inspector.vue"),
        file: resolver.resolve('./runtime/pages/__powersync-inspector.vue'),
        name: 'Powersync Inspector'
      });
    });

    addImportsFrom(
      [
        'createPowerSyncPlugin',
        'providePowerSync',
        'usePowerSync',
        'usePowerSyncQuery',
        'usePowerSyncStatus',
        'usePowerSyncWatchedQuery',
        'useQuery',
        'useStatus',
        'useWatchedQuerySubscription'
      ],
      '@powersync/vue'
    );

    // Ensure the packages are transpiled
    nuxt.options.build.transpile = nuxt.options.build.transpile || [];
    nuxt.options.build.transpile.push('reka-ui', '@tanstack/vue-table', '@powersync/web', '@journeyapps/wa-sqlite');

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

    // making the asset available via HTTP for devtools
    // this Add a Vite plugin to serve the asset at /assets/powersync-icon.svg
    nuxt.hook('vite:extendConfig', async (config, { isClient }) => {
      if (!isClient) return;

      const { readFileSync } = await import('node:fs');
      const assetPath = resolver.resolve('./runtime/assets/powersync-icon.svg');
      const vitePlugin = {
        name: 'powersync-assets',
        configureServer(server: any) {
          // Serve the asset at /assets/powersync-icon.svg
          server.middlewares.use('/assets/powersync-icon.svg', (req: any, res: any, next: any) => {
            try {
              const content = readFileSync(assetPath);
              res.setHeader('Content-Type', 'image/svg+xml');
              res.end(content);
            } catch {
              next();
            }
          });
        }
      };

      // Add plugin to existing plugins array
      const plugins = config.plugins || [];
      plugins.push(vitePlugin);
      // @ts-ignore - plugins is read-only but we need to modify it
      config.plugins = plugins;
    });

    setupDevToolsUI(nuxt);
  }
});
