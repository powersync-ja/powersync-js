<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for Node.js

_[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres, MongoDB or MySQL on the server-side._

This package (`packages/node`) is the PowerSync SDK for Node.js clients. It is an extension of `packages/common`.
Using this package is not necessary for PowerSync on servers, see [our documentation](https://docs.powersync.com/installation/app-backend-setup) for more details on that.

This package has an API similar to the PowerSync web SDK, for which a summary of features is available [here](https://docs.powersync.com/client-sdk-references/js-web).

## Alpha Release

The `@powersync/node` package is currently in an Alpha release.

# Installation

## Install Package

```bash
npm install @powersync/node
```

Both `@powersync/node` and the `better-sqlite3` packages have install scripts that need to run to compile
or download sqlite3 and PowerSync binaries.

# Getting Started

You can follow along our [web SDK reference](https://docs.powersync.com/client-sdk-references/js-web)
which contains everything you need to know to get started implementing PowerSync in your project.
Replace imports of `@powersync/web` with `@powersync/node` where necessary.

# Examples

A simple example using `@powersync/node` is available in the [`demos/example-node/`](../demos/example-node) directory.

# Found a bug or need help?

- Join our [Discord server](https://discord.gg/powersync) where you can browse topics from our community, ask questions, share feedback, or just say hello :)
- Please open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues) when you come across a bug.
- Have feedback or an idea? [Submit an idea](https://roadmap.powersync.com/tabs/5-roadmap/submit-idea) via our public roadmap or [schedule a chat](https://calendly.com/powersync-product/powersync-chat) with someone from our product team.

# Thanks

The PowerSync Node.js SDK relies on the work contributors and maintainers have put into the upstream better-sqlite3 package.
In particular, we'd like to thank [@spinda](https://github.com/spinda) for contributing support for update, commit and rollback hooks!
