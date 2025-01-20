# OP-SQLite Factory for the PowerSync React Native SDK

## Overview

This package (`packages/powersync-op-sqlite`) enables using [OP-SQLite](https://github.com/op-engineering/op-sqlite) with PowerSync alongside the [React Native SDK](https://docs.powersync.com/client-sdk-references/react-native-and-expo).

If you are not yet familiar with PowerSync, please see the [PowerSync React Native SDK README](https://github.com/powersync-ja/powersync-js/tree/main/packages/react-native) for more information.

### Alpha release

This package is currently in an alpha release. If you find a bug or issue, please open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues). Questions or feedback can be posted on our [community Discord](https://discord.gg/powersync) - we'd love to hear from you.

## Installation

Follow the installation instructions for the [React Native SDK](https://github.com/powersync-ja/powersync-js/tree/main/packages/react-native) if you haven't yet set up PowerSync in your project. However, note that this package cannot be installed alongside `@journeyapps/react-native-quick-sqlite`. Skip the step about installing it as a peer dependency, or uninstall it if it is already installed.

### Install Package

```bash
npx expo install @powersync/op-sqlite
```

### Install Peer Dependency:

This SDK currently requires `@op-engineering/op-sqlite` as a peer dependency.

Install it in your app with:

```bash
npx expo install @op-engineering/op-sqlite
```

## Usage

```typescript
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { PowerSyncDatabase } from '@powersync/react-native';

const factory = new OPSqliteOpenFactory({
  dbFilename: 'sqlite.db'
});

this.powersync = new PowerSyncDatabase({ database: factory, schema: AppSchema });
```

### Encryption with SQLCipher

To enable SQLCipher you need to add the following configuration option to your application's `package.json`

```json
{
  // your normal package.json
  // ...
  "op-sqlite": {
    "sqlcipher": true
  }
}
```

Additionally you will need to add an [encryption key](https://www.zetetic.net/sqlcipher/sqlcipher-api/#key) to the OPSQLite factory constructor

```typescript
const factory = new OPSqliteOpenFactory({
  dbFilename: 'sqlite.db',
  sqliteOptions: {
    encryptionKey: 'your-encryption-key'
  }
});
```

### Loading SQLite extensions

To load additional SQLite extensions include the `extensions` option in `sqliteOptions` which expects an array of objects with a `path` and an `entryPoint`:

```js
sqliteOptions: {
  extensions: [
      { path: libPath, entryPoint: 'sqlite3_powersync_init' }
  ]
}
```

More info can be found in the [OP-SQLite docs](https://op-engineering.github.io/op-sqlite/docs/api/#loading-extensions).

Example usage:

```ts
let libPath: string
if (Platform.OS === 'ios') {
  const bundlePath: string = getBundlePath();
  libPath = `${bundlePath}/Frameworks/powersync-sqlite-core.framework/powersync-sqlite-core`;
} else {
  libPath = 'libpowersync';
}

const factory = new OPSqliteOpenFactory({
  dbFilename: 'sqlite.db',
  sqliteOptions: {
    extensions: [
        { path: libPath, entryPoint: 'sqlite3_powersync_init' }
    ]
  }
});
```

## Native Projects

This package uses native libraries. Create native Android and iOS projects (if not created already) by running:

```bash
npx expo run:android
# OR
npx expo run:ios
```
