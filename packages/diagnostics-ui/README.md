# PowerSync Diagnostics — UI

`@powersync/diagnostics-ui` is the [PowerSync](https://powersync.com) DevTools UI: a Vue 3 panel that shows the live state of a PowerSync client.

**Internal package.** PowerSync SDKs and tools depend on it. Do not add it to your app. Use [`@powersync/diagnostics`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics) instead.

Every host shows the same build. The panel reads data only through an `SdkIntegration` from [`@powersync/diagnostics-core`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-core). It imports nothing from any PowerSync SDK and knows no host.

## Tabs

- **Sync Status** — connection state, sync progress, the upload queue, priority sync, and a "Sync now" checkpoint request.
- **Data Inspector** — a searchable table and view tree, and a SQL console with syntax highlighting.
- **Buckets** — per-bucket downloaded and total operations, size, and a drill-down into a bucket's operations.
- **Streams** — sync stream subscriptions with progress, TTL, and priority, and a subscribe/unsubscribe form.
- **Config** — connection details and the schema as a tree or JSON.
- **Logs** — client logs with a level filter and search.

## Embed the built page

`dist/standalone/` is a self-contained page. It gets its `SdkIntegration` in one of two ways, in this order: from a [devframe](https://devfra.me) host that serves it (the `@powersync/diagnostics` definition), or from a parent page that hands it a `MessagePort` with `attachIframe` from `@powersync/diagnostics-core`. Only this bootstrap (`standalone/`) knows about devframe. The components in `src/` take an `SdkIntegration` and nothing else.

## Use the component

To render the panel inside your own Vue app, provide an integration and mount the panel:

```vue
<script setup lang="ts">
import { DiagnosticsPanel, provideDiagnostics } from '@powersync/diagnostics-ui';
import '@powersync/diagnostics-ui/style.css';
import { integration } from './integration';

provideDiagnostics(integration);
</script>

<template>
  <DiagnosticsPanel />
</template>
```

`provideDiagnostics` also accepts a `Promise<SdkIntegration>`, for a host that gets its integration after setup.

A host that owns the theme passes it as an option: `provideDiagnostics(integration, { theme: 'dark' })`. The value can be a string, a ref or a getter. The panel then follows it, hides its own toggle and stores nothing. The standalone page takes the theme in two ways: `?theme=dark|light` on its URL, or a `message` event `{ type: 'powersync-diagnostics:theme', theme: 'dark' | 'light' }` posted to its window. Use the message when the host learns the theme later or changes it at runtime.

## Development

```bash
pnpm --filter @powersync/diagnostics-ui dev
```

This opens a playground at `http://localhost:5199`. It runs the panel over a mock integration, with no backend. Add `?noclient` to see the screen shown when no client is found, or `?theme=dark` to see a host-controlled theme.
