<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for Node.js

_[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres, MongoDB, MySQL or SQL Server on the server-side._

This package (`packages/node`) is the PowerSync SDK for Node.js clients. It is an extension of `packages/common`.
Using this package is not necessary for PowerSync on servers, see [our documentation](https://docs.powersync.com/installation/app-backend-setup) for more details on that.

See a summary of features [here](https://docs.powersync.com/client-sdk-references/node).

## Beta Release

The `@powersync/node` package is currently in a Beta release.

## Installation

### Install Package

```bash
npm install @powersync/node better-sqlite3
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

#### Package better-sqlite3 not found errors

This package does not import `better-sqlite3` statically (with unconditional `require()` or static `import` statements).
Instead, to allow users to use `node:sqlite` instead of that package, a dynamic `require()` / `import` expression is used.
This may prevent bundlers from detecting that `better-sqlite3` is used by this package.

To fix this, ensure you have a dependency on `better-sqlite3` (and, if you're using TypeScript, a dev-dependency on
`@types/better-sqlite3`).

In your project, create a `PowerSync.worker.ts` file with the following contents:

```TypeScript
import Database from 'better-sqlite3';

import { startPowerSyncWorker } from '@powersync/node/worker.js';

async function resolveBetterSqlite3() {
  return Database;
}

startPowerSyncWorker({ loadBetterSqlite3: resolveBetterSqlite3 });
```

Finally, when you open the `PowerSyncDatabase`, instruct PowerSync to use your custom worker:

```TypeScript
const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'test.db',
    openWorker: (_, options) => {
      return new Worker(new URL('./PowerSync.worker.js', import.meta.url), options);
    }
  },
  logger
});
```

## Getting Started

The [Node.js SDK reference](https://docs.powersync.com/client-sdk-references/node)
contains everything you need to know to get started implementing PowerSync in your project.

## Examples

A simple example using `@powersync/node` is available in the [`demos/example-node/`](../demos/example-node) directory.

## Proxy Support

This SDK supports HTTP, HTTPS, and WebSocket proxies via environment variables.

### HTTP Connection Method

Internally we probe the http environment variables and apply it to fetch requests ([undici](https://www.npmjs.com/package/undici/v/5.6.0))

- Set the `HTTPS_PROXY` or `HTTP_PROXY` environment variable to automatically route HTTP requests through a proxy.

### WEB Socket Connection Method

Internally the [proxy-agent](https://www.npmjs.com/package/proxy-agent) dependency for WebSocket proxies, which has its own internal code for automatically picking up the appropriate environment variables:

- Set the `WS_PROXY` or `WSS_PROXY` environment variable to route the webocket connections through a proxy.

## Encryption

This package can be used with the [`better-sqlite3-multiple-ciphers`](https://www.npmjs.com/package/better-sqlite3-multiple-ciphers) fork of `better-sqlite3` for encryption.

This requires a custom worker loading the forked package:

```TypeScript
// encryption.worker.ts
import Database from 'better-sqlite3-multiple-ciphers';

import { startPowerSyncWorker } from '@powersync/node/worker.js';

async function resolveBetterSqlite3() {
  return Database;
}

startPowerSyncWorker({ loadBetterSqlite3: resolveBetterSqlite3 });
```

Then, when opening the database, use that custom worker:

```TypeScript
const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'test.db',
    openWorker: (_, options) => {
      return new Worker(new URL('./PowerSync.worker.js', import.meta.url), options);
    },
    initializeConnection: async (db) => {
      if (encryptionKey.length) {
        const escapedKey = encryptionKey.replace("'", "''");
        await db.execute(`pragma key = '${escapedKey}'`);
      }

      // Make sure the database is readable, this fails early if the key is wrong.
      await db.execute('pragma user_version');
    }
  },
  logger
});
```

## Found a bug or need help?

- Join our [Discord server](https://discord.gg/powersync) where you can browse topics from our community, ask questions, share feedback, or just say hello :)
- Please open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues) when you come across a bug.
- Have feedback or an idea? [Submit an idea](https://roadmap.powersync.com/tabs/5-roadmap/submit-idea) via our public roadmap or [schedule a chat](https://calendly.com/powersync-product/powersync-chat) with someone from our product team.

## Thanks

The PowerSync Node.js SDK relies on the work contributors and maintainers have put into the upstream better-sqlite3 package.
In particular, we'd like to thank [@spinda](https://github.com/spinda) for contributing support for update, commit and rollback hooks!
