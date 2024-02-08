# PowerSync SDK for Web

[PowerSync](https://powersync.co) is a service and set of SDKs that keeps Postgres databases in sync with on-device SQLite databases.

## Beta Release

The web SDK package is currently in a Beta release.

# Installation

## Install Package

```bash
npm install @journeyapps/powersync-sdk-web
```

## Install Peer Dependency: WA-SQLite

This SDK currently requires `@journeyapps/wa-sqlite` as a peer dependency.

Install it in your app with:

```bash
npm install @journeyapps/wa-sqlite
```

## Logging

This package uses [js-logger](https://www.npmjs.com/package/js-logger) for logging.

Enable JS Logger with your logging interface of choice or use the default `console`

```JavaScript
import Logger from 'js-logger';

// Log messages will be written to the window's console.
Logger.useDefaults();
```

Enable verbose output in the developer tools for detailed logs.

The WASQLite DB Adapter opens SQLite connections inside a shared webworker. This worker can be inspected in Chrome by accessing

```
chrome://inspect/#workers
```

# Getting Started

See our [Docs](https://docs.powersync.co/usage/installation/client-side-setup) for detailed instructions.

```JavaScript
import {
  Column,
  ColumnType,
  WASQLitePowerSyncDatabaseOpenFactory,
  Schema,
  Table
} from '@journeyapps/powersync-sdk-web';

export const AppSchema = new Schema([
  new Table({ name: 'customers', columns: [new Column({ name: 'name', type: ColumnType.TEXT })] })
]);

let PowerSync;

export const openDatabase = async () => {
  PowerSync = new WASQLitePowerSyncDatabaseOpenFactory({
    schema: AppSchema,
    dbFilename: 'test.sqlite',
    flags: {
        // This is disabled once CSR+SSR functionality is verified to be working correctly
        disableSSRWarning: true,
  }}).getInstance();

  await PowerSync.init();

  // Run local statements.
  await PowerSync.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', ['Fred']);
};

class Connector {
  async fetchCredentials() {
    // TODO logic to fetch a session
    return {
      endpoint: '[The PowerSync instance URL]',
      token: 'An authentication token',
      expiresAt: 'When the token expires',
    };
  }

  async uploadData(database) {
    // Upload local changes to backend, see docs for example
  }
}

export const connectPowerSync = async () => {
  const connector = new Connector(); // Which was declared above
  await PowerSync.connect(connector);
};

```

React hooks are available in the [@journeyapps/powersync-react](https://www.npmjs.com/package/@journeyapps/powersync-react) package

## Multiple Tab Support

Using PowerSync between multiple tabs is supported on some web browsers. Multiple tab support relies on shared web workers for DB and sync streaming operations. When enabled shared web workers named `shared-sync-[dbFileName]` and `shared-DB-worker-[dbFileName]` will be created.

The shared database worker will ensure writes to the DB will instantly be available between tabs.

The shared sync worker will co-ordinate for one active tab to connect to the PowerSync instance and share the latest sync state between tabs.

Currently using the SDK in multiple tabs without enabling the `enableMultiTabs` flag will spawn a standard web worker per tab for DB operations. These workers are safe to operate on the DB concurrently, however changes from one tab may not update watches on other tabs. Only one tab can sync from the PowerSync instance at a time. The sync status will not be shared between tabs, only the oldest tab will connect and display the latest sync status.

Multiple tab support is not currently available on Android or Safari.

Support is enabled by default if available. This can be disabled as below:

```Javascript
PowerSync = new WASQLitePowerSyncDatabaseOpenFactory({
    schema: AppSchema,
    dbFilename: 'test.sqlite',
    flags: {
        // This is disabled once CSR+SSR functionality is verified to be working correctly
        disableSSRWarning: true,
        /**
         * Multiple tab support is enabled by default if available. This can be disabled by
         * setting this flag to false.
         */
        enableMultiTabs: false
  }}).getInstance();
```

## Demo Apps

See the [list of demo apps](https://github.com/powersync-ja/powersync-web-sdk/?tab=readme-ov-file#demos) in the repo README.
