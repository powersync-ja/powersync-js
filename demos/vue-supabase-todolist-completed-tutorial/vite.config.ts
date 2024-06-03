import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    plugins: [vue(), wasm(), topLevelAwait()],
    define: { "process.env": {} },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
    },
    optimizeDeps: {
      // Don't optimize these packages as they contain web workers and WASM files.
      // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
      exclude: ["@journeyapps/wa-sqlite", "@powersync/web"],
      include: [
        "@powersync/web > uuid",
        "@powersync/web > event-iterator",
        "@powersync/web > js-logger",
        "@powersync/web > lodash/throttle",
        "@powersync/web > can-ndjson-stream",
        "@powersync/web > bson",
        "@powersync/web > buffer",
        "@powersync/web > rsocket-core",
        "@powersync/web > rsocket-websocket-client",
        "@powersync/web > cross-fetch",
      ],
    },
    worker: {
      format: "es",
      plugins: () => [wasm(), topLevelAwait()],
    },
    build: {
      sourcemap: !isDev, // Disable sourcemaps in development
    },
  };
});
