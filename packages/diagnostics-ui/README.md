# PowerSync Diagnostics — UI

This package (`packages/diagnostics-ui`) is the [PowerSync](https://powersync.com) diagnostics UI: a Vue 3 panel that shows the live state of a PowerSync client.

It is built once and reused by every host. It reads data only through an `SdkIntegration` from [`@powersync/diagnostics-core`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-core), and imports nothing from any PowerSync SDK.

## Tabs

- **Sync Status** — connection state, sync progress, the upload queue, priority sync, and a "Sync now" checkpoint request.
- **Data Inspector** — a searchable table and view tree, and a SQL console with syntax highlighting.
- **Buckets** — per-bucket downloaded and total operations, size, and a drill-down into a bucket's operations.
- **Streams** — sync stream subscriptions with progress, TTL, and priority, and a subscribe/unsubscribe form.
- **Config** — connection details and the schema as a tree or JSON.
- **Logs** — client logs with a level filter and search.

## Who uses it

Most apps do not install this package directly. [`@powersync/diagnostics`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics) serves the built UI for you, and [`@powersync/nuxt`](https://github.com/powersync-ja/powersync-js/tree/main/packages/nuxt) shows it as a Nuxt DevTools tab.

## Embed the built page

`dist/standalone/` is a self-contained page. It finds its `SdkIntegration` in one of two ways, tried in this order: a [devframe](https://devfra.me) host that serves it (the `@powersync/diagnostics` definition), or a parent page that hands it a `MessagePort` with `attachIframe` from `@powersync/diagnostics-core`. Only this bootstrap (`standalone/`) knows about devframe; the components in `src/` take an `SdkIntegration` and nothing else.

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

`provideDiagnostics` also accepts a `Promise<SdkIntegration>`, for a host that receives its integration after setup.

## Development

```bash
pnpm --filter @powersync/diagnostics-ui dev
```

This opens a playground at `http://localhost:5199` that runs the panel over a mock database, with no backend. Add `?noclient` to preview the state shown when no client is found.
