# PowerSync Dev

A development package for PowerSync which uses [SQL.js](https://sql.js.org/#/) to provide a pure JavaScript SQLite implementation.
This eliminates the need for native dependencies and enables seamless development with Expo Go and other JavaScript-only environments.

This package is specifically designed to streamline the development workflow and will be much slower than DB adapters that use native dependencies.
For example, when building React Native apps we recommend switching to our [react-native-quick-sqlite](https://www.npmjs.com/package/@journeyapps/react-native-quick-sqlite) or [OP-SQLite](https://www.npmjs.com/package/@powersync/op-sqlite) adapters when making production builds as they give substantially better performance.

## Note: Alpha Release

This package is currently in an alpha release.

## Usage

By default the SQLJS adapter will be in-memory. Read further for persister examples.

```tsx
import { SQLJSOpenFactory } from '@powersync/dev';

const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: new SQLJSOpenFactory({
    dbFilename: 'powersync.db'
  })
});
```

## Persister examples

### Expo

We can use the [Expo File System](https://docs.expo.dev/versions/latest/sdk/filesystem/) to persist the database in an Expo app.

```tsx
import { PowerSyncDatabase, SQLJSOpenFactory, SQLJSPersister } from '@powersync/react-native';
import * as FileSystem from 'expo-file-system';

const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: new SQLJSOpenFactory({
    dbFilename: 'powersync.db',
    persister: createSQLJSPersister('powersync.db')
  })
});

const createSQLJSPersister = (dbFilename: string): SQLJSPersister => {
  const dbPath = `${FileSystem.documentDirectory}${dbFilename}`;

  return {
    readFile: async (): Promise<ArrayLike<number> | Buffer | null> => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(dbPath);
        if (!fileInfo.exists) {
          return null;
        }

        const result = await FileSystem.readAsStringAsync(dbPath, {
          encoding: FileSystem.EncodingType.Base64
        });

        const binary = atob(result);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch (error) {
        console.error('Error reading database file:', error);
        return null;
      }
    },

    writeFile: async (data: ArrayLike<number> | Buffer): Promise<void> => {
      try {
        const uint8Array = new Uint8Array(data);
        const binary = Array.from(uint8Array, (byte) => String.fromCharCode(byte)).join('');
        const base64 = btoa(binary);

        await FileSystem.writeAsStringAsync(dbPath, base64, {
          encoding: FileSystem.EncodingType.Base64
        });
      } catch (error) {
        console.error('Error writing database file:', error);
        throw error;
      }
    }
  };
};
```
