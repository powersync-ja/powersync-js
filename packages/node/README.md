<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for Node.js

_[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres, MongoDB or MySQL on the server-side._

This package (`packages/node`) is the PowerSync SDK for Node.js clients. It is an extension of `packages/common`.
Using this package is not necessary for PowerSync on servers, see [our documentation](https://docs.powersync.com/installation/app-backend-setup) for more details on that.

See a summary of features [here](https://docs.powersync.com/client-sdk-references/node).

## Alpha Release

The `@powersync/node` package is currently in an Alpha release.

# Installation

## Install Package

```bash
npm install @powersync/node
```

Both `@powersync/node` and the `better-sqlite3` packages have install scripts that need to run to compile
or download sqlite3 and PowerSync binaries.

### Common Installation Issues

The `better-sqlite` package requires native compilation, which depends on certain system tools. This compilation process is handled by `node-gyp` and may fail if required dependencies are missing or misconfigured.

#### Node-gyp Version Conflicts

`better-sqlite` depends on `node-gyp@^11`, but some project configurations may introduce multiple versions of `node-gyp`, potentially causing build issues.

#### Python Dependency Issues

`node-gyp` requires Python for compilation. If your project uses `node-gyp` below version `10` and your system has Python `3.12` or later, you may encounter the following error:

```python
ModuleNotFoundError: No module named 'distutils'
```

To resolve this, either:

- Upgrade `node-gyp` to version 10 or later.
- Install Python [setuptools](https://pypi.org/project/setuptools/), which includes `distutils`.

# Getting Started

The [Node.js SDK reference](https://docs.powersync.com/client-sdk-references/node)
contains everything you need to know to get started implementing PowerSync in your project.

# Examples

A simple example using `@powersync/node` is available in the [`demos/example-node/`](../demos/example-node) directory.

# Proxy Support

This SDK supports HTTP, HTTPS, and WebSocket proxies via environment variables.

## HTTP Connection Method

Internally we probe the http environment variables and apply it to fetch requests ([undici](https://www.npmjs.com/package/undici/v/5.6.0))

- Set the `HTTPS_PROXY` or `HTTP_PROXY` environment variable to automatically route HTTP requests through a proxy.

## WEB Socket Connection Method

Internally the [proxy-agent](https://www.npmjs.com/package/proxy-agent) dependency for WebSocket proxies, which has its own internal code for automatically picking up the appropriate environment variables:

- Set the `WS_PROXY` or `WSS_PROXY` environment variable to route the webocket connections through a proxy.

# Found a bug or need help?

- Join our [Discord server](https://discord.gg/powersync) where you can browse topics from our community, ask questions, share feedback, or just say hello :)
- Please open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues) when you come across a bug.
- Have feedback or an idea? [Submit an idea](https://roadmap.powersync.com/tabs/5-roadmap/submit-idea) via our public roadmap or [schedule a chat](https://calendly.com/powersync-product/powersync-chat) with someone from our product team.

# Thanks

The PowerSync Node.js SDK relies on the work contributors and maintainers have put into the upstream better-sqlite3 package.
In particular, we'd like to thank [@spinda](https://github.com/spinda) for contributing support for update, commit and rollback hooks!
