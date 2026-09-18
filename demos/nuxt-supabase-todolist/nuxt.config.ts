import type { Plugin } from 'vite';

/**
 * Nuxt's `nuxt:replace` plugin rewrites `import.meta.*` defines with a text search, including inside
 * string literals. Vite prepends its env module, which lists those defines as object keys, to workers
 * spawned with `@vite-ignore` options such as the PowerSync worker. The replaced keys are not valid
 * JavaScript and the worker fails to transform. This plugin runs before `nuxt:replace` and turns the
 * keys into computed keys the text search cannot match.
 */
function workerEnvDefinesWorkaround(): Plugin {
  return {
    name: 'powersync-demo:worker-env-defines',
    transform(code, id) {
      if (!id.includes('worker_file&type=ignore')) return;
      return { code: code.replace(/"import\.meta\.(\w+)":/g, '["import.meta" + ".$1"]:'), map: null };
    }
  };
}

export default defineNuxtConfig({
  modules: ['@powersync/nuxt', '@nuxt/eslint', '@nuxt/ui', '@nuxtjs/supabase'],
  ssr: false,

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      powersyncUrl: process.env.NUXT_PUBLIC_POWERSYNC_URL
    }
  },

  // enable hot reloading when we make changes to our module
  watch: ['../src/*', './**/*'],

  compatibilityDate: '2024-07-05',

  vite: {
    optimizeDeps: {
      exclude: ['@powersync/web'],
      include: ['@supabase/postgrest-js']
    },

    worker: {
      format: 'es'
    },

    plugins: [workerEnvDefinesWorkaround()]
  },

  unocss: {
    autoImport: false
  },

  eslint: {
    config: {
      stylistic: true
    }
  },

  powersync: {
    useDiagnostics: true,
    kysely: true
  },

  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/unprotected', '/public/*']
    },
    clientOptions: {
      auth: {
        persistSession: true
      }
    }
  }
});
