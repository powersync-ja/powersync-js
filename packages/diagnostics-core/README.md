# PowerSync Diagnostics — core

This package (`packages/diagnostics-core`) defines the protocol between the [PowerSync](https://powersync.com) diagnostics tool and a PowerSync SDK, and ships the pieces that implement it for JavaScript.

It imports nothing from any PowerSync SDK. The protocol is owned by the tool, and each SDK implements it in its own language.

## What is in the package

- **`SdkIntegration`** — the interface an SDK implements so the diagnostics UI can inspect a live client: run SQL, read the schema and connection info, observe sync state, and run control actions. See [`PROTOCOL.md`](./PROTOCOL.md) for the full contract and data shapes.
- **`JsAgent`** — the JavaScript implementation. It runs in the app page next to a live database and reads it through a structural `LiveDatabase` interface.
- **The iframe bridge** — `exposeIntegration`, `connectIntegration`, `attachIframe`, and `awaitIntegration` move an integration across a `postMessage` boundary with [comlink](https://github.com/GoogleChromeLabs/comlink). The UI always runs in an iframe; the integration lives on the other side.
- **`createDiagnosticsStores`** — reactive stores derived from an integration's events, for the UI.

## Who uses it

Most apps do not use this package directly. Use [`@powersync/diagnostics-vite`](https://github.com/powersync-ja/powersync-js/tree/main/packages/diagnostics-vite), which runs the agent and serves the UI for you.

Use this package directly when you build a new host or a new SDK integration.

## Implement the protocol for a new SDK

Implement `SdkIntegration` in your language, then hand it to the UI. On the web this means serving it on a `MessagePort` to the UI iframe:

```ts
import { attachIframe, type SdkIntegration } from '@powersync/diagnostics-core';

const integration: SdkIntegration = createMyIntegration();
const frame = document.querySelector('iframe#diagnostics')!;
const stop = attachIframe(integration, frame);
```

The UI side calls `awaitIntegration()` and receives the port. [`PROTOCOL.md`](./PROTOCOL.md) lists every method and shape an implementation must provide.

## Run the JavaScript agent yourself

```ts
import { JsAgent, exposeIntegration } from '@powersync/diagnostics-core';

const agent = new JsAgent(db, {
  sdk: '@powersync/web',
  connection: {
    getConnector: () => db.connector,
    getConnectionOptions: () => db.connectionOptions
  }
});

const channel = new MessageChannel();
exposeIntegration(agent, channel.port1);
// Post channel.port2 to the UI iframe.
```
