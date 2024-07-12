<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for Web

*[PowerSync](https://www.powersync.com) is a Postgres-SQLite sync layer, which helps developers to create local-first real-time reactive apps that work seamlessly both online and offline.*

This package (`packages/web`) is the PowerSync SDK for JavaScript Web clients. It is an extension of `packages/common`.

See a summary of features [here](https://docs.powersync.com/client-sdk-references/js-web).

# Installation

## Install Package

```bash
npm install @powersync/web
```

## Install Peer Dependency: WA-SQLite

This SDK currently requires `@powersync/wa-sqlite` as a peer dependency.

Install it in your app with:

```bash
npm install @powersync/wa-sqlite
```

## Polyfills

### WebSocket Connections: Buffer

Note: Beta Release - WebSockets are currently in a beta release. It should be safe to use in production if sufficient testing is done on the client side.

This SDK connects to a PowerSync instance via HTTP streams (enabled by default) or WebSockets. The WebSocket connection method requires `Buffer` to be available in the global scope. When multiple tabs are used the shared web worker will apply a polyfill in its own scope, but the `Buffer` class should be polyfills in the application for cases where multiple tabs are not supported.

Install a suitable Buffer implementation

```bash
npm install buffer
```

Apply it in your application if not yet provided

```Javascript
import { Buffer } from 'buffer';

if (typeof self.Buffer == 'undefined') {
  self.Buffer = Buffer;
}
```

## Webpack

See the [example Webpack config](https://github.com/powersync-ja/powersync-js/blob/main/demos/example-webpack/webpack.config.js) for details on polyfills and requirements.

## Vite

See the [example Vite config](https://github.com/powersync-ja/powersync-js/blob/main/demos/example-vite/vite.config.ts) for details on polyfills and requirements.

# Getting Started

Our [full SDK reference](https://docs.powersync.com/client-sdk-references/js-web) contains everything you need to know to get started implementing PowerSync in your project.

# Changelog

A changelog for this SDK is available [here](https://releases.powersync.com/announcements/powersync-js-web-client-sdk).

# API Reference

The full API reference for this SDK can be found [here](https://powersync-ja.github.io/powersync-js/web-sdk).

# Examples

For example projects built with PowerSync on Web, see our [Demo Apps / Example Projects](https://docs.powersync.com/resources/demo-apps-example-projects#js-web) gallery. Most of these projects can also be found in the [`demos/`](../demos/) directory.

# Found a bug or need help?

- Join our [Discord server](https://discord.gg/powersync) where you can browse topics from our community, ask questions, share feedback, or just say hello :)
- Please open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues) when you come across a bug.
- Have feedback or an idea? [Submit an idea](https://roadmap.powersync.com/tabs/5-roadmap/submit-idea) via our public roadmap or [schedule a chat](https://calendly.com/powersync-product/powersync-chat) with someone from our product team.
