<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for Web

_[PowerSync](https://www.powersync.com) keeps a client-side SQLite database in sync with your backend database. Changes appear across users and devices in real-time, user interactions feel instant and your app continues to work even when offline. Supports Postgres, MongoDB, MySQL, and SQL Server. Client SDKs are available for a wide range of environments including web, mobile, desktop, headless and embedded._

This package (`packages/web`) is the PowerSync SDK for JavaScript Web clients. It is an extension of `packages/common`.

See a summary of features [here](https://docs.powersync.com/client-sdk-references/js-web).

# Installation

## Install Package

```bash
npm install @powersync/web
```

### Encryption with Multiple Ciphers

To enable encryption you need to specify an encryption key when instantiating the PowerSync database.

> The PowerSync Web SDK uses the ChaCha20 cipher algorithm by [default](https://utelle.github.io/SQLite3MultipleCiphers/docs/ciphers/cipher_chacha20/).

```typescript
export const db = new PowerSyncDatabase({
  // The schema you defined
  schema: AppSchema,
  database: {
    // Filename for the SQLite database — it's important to only instantiate one instance per file.
    dbFilename: 'example.db'
    // Optional. Directory where the database file is located.'
    // dbLocation: 'path/to/directory'
  },
  // Encryption key for the database.
  encryptionKey: 'your-encryption-key'
});

// If you are using a custom WASQLiteOpenFactory or WASQLiteDBAdapter, you need specify the encryption key inside the construtor
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: new WASQLiteOpenFactory({
    //new WASQLiteDBAdapter
    dbFilename: 'example.db',
    vfs: WASQLiteVFS.OPFSCoopSyncVFS,
    // Encryption key for the database.
    encryptionKey: 'your-encryption-key'
  })
});
```

## Webpack

See the [example Webpack config](https://github.com/powersync-ja/powersync-js/blob/main/demos/example-webpack/webpack.config.js) for details on polyfills and requirements.

## Vite

See the [example Vite config](https://github.com/powersync-ja/powersync-js/blob/main/demos/example-vite/vite.config.ts) for details on polyfills and requirements.

# Getting Started

Our [full SDK reference](https://docs.powersync.com/client-sdk-references/js-web) contains everything you need to know to get started implementing PowerSync in your project.

# Public Workers

For some frameworks, it may be required to configure the web workers ([see the docs](https://docs.powersync.com/client-sdk-references/react-native-and-expo/react-native-web-support)).
The `@powersync/web` package includes a CLI utility which can copy the required assets to the `public` directory (configurable with the `--output` option).

```bash
pnpm powersync-web copy-assets
```

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
