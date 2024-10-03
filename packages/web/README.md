<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for Web

*[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres or MongoDB on the server-side (MySQL coming soon).*

This package (`packages/web`) is the PowerSync SDK for JavaScript Web clients. It is an extension of `packages/common`.

See a summary of features [here](https://docs.powersync.com/client-sdk-references/js-web).

# Installation

## Install Package

```bash
npm install @powersync/web
```

## Install Peer Dependency: WA-SQLite

This SDK currently requires `@journeyapps/wa-sqlite` as a peer dependency.

Install it in your app with:

```bash
npm install @journeyapps/wa-sqlite
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
