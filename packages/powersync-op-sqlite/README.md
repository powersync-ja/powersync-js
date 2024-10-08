<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for React Native

_[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres or MongoDB on the server-side (MySQL coming soon)._

This package (`packages/powersync-op-sqlite`) enables using OP-SQLite with PowerSync. It is an extension of `packages/common`.

# Installation

## Install Package

```bash
npx expo install @powersync/op-sqlite
```

## Install Peer Dependency: SQLite

This SDK currently requires `@op-engineering/op-sqlite` as a dependency.

Install it in your app with:

```bash
npx expo install @op-engineering/op-sqlite
```

**Note**: This package cannot be installed alongside `@journeyapps/react-native-quick-sqlite`. Please ensure you do **not** install both packages at the same time.

# Native Projects

This package uses native libraries. Create native Android and iOS projects (if not created already) by running:

```bash
npx expo run:android
# OR
npx expo run:ios
```

# Getting Started

Our [SDK reference](https://docs.powersync.com/client-sdk-references/react-native-and-expo) contains everything you need to know to get started implementing PowerSync in your project.

# Changelog

A changelog for this SDK is available [here](https://releases.powersync.com/announcements/react-native-client-sdk).

# API Reference

The full API reference for this SDK can be found [here](https://powersync-ja.github.io/powersync-js/react-native-sdk).

# Examples

For example projects built with PowerSync and React Native, see our [Demo Apps / Example Projects](https://docs.powersync.com/resources/demo-apps-example-projects#react-native-and-expo) gallery. Most of these projects can also be found in the [`demos/`](../demos/) directory.

# Found a bug or need help?

- Join our [Discord server](https://discord.gg/powersync) where you can browse topics from our community, ask questions, share feedback, or just say hello :)
- Please open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues) when you come across a bug.
- Have feedback or an idea? [Submit an idea](https://roadmap.powersync.com/tabs/5-roadmap/submit-idea) via our public roadmap or [schedule a chat](https://calendly.com/powersync-product/powersync-chat) with someone from our product team.
