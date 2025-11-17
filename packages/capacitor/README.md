<p align="center">
	<a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

# PowerSync SDK for Capacitor

_[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres, MongoDB or MySQL on the server-side._

This package (`@powersync/capacitor`) is the PowerSync SDK for Capacitor apps. It wraps the [PowerSync Web SDK](https://www.npmjs.com/package/@powersync/web) for Capacitor PWAs and uses [Capacitor Community SQLite](https://github.com/capacitor-community/sqlite) as the database driver for Android and iOS.

## Note: Alpha Release

This package is currently in an alpha release.

## Installation

### Install Package

```bash
npm install @powersync/capacitor
```

This package uses `@powersync/web` as a peer dependency. For additional `@powersync/web` configuration and instructions see the Web SDK [README](https://www.npmjs.com/package/@powersync/web).

### Install Peer Dependencies

You must also install the following peer dependencies:

```bash
npm install @capacitor-community/sqlite @powersync/web @journeyapps/wa-sqlite
```

See the [Capacitor Community SQLite](https://github.com/capacitor-community/sqlite?tab=readme-ov-file#installation) repository for additional instructions.

### Sync Capacitor Plugins

After installing, sync your Capacitor project:

```bash
npx cap sync
```

## Usage

```javascript
import { PowerSyncDatabase } from '@powersync/capacitor';
// Import general components from the Web SDK package
import { Schema } from '@powersync/web';
/**
 * The Capacitor PowerSyncDatabase will automatically detect the platform
 * and use the appropriate database drivers.
 */
const db = new PowerSyncDatabase({
  schema: new Schema({...}),
  database: {
    dbFilename: "mydatabase.sqlite"
  }
});
```

- On Android and iOS, this SDK uses [Capacitor Community SQLite](https://github.com/capacitor-community/sqlite) for native database access.
- On web, it falls back to the [PowerSync Web SDK](https://www.npmjs.com/package/@powersync/web).

When using custom database factories, be sure to specify the `CapacitorSQLiteOpenFactory` for Capacitor platforms.

```javascript
const db = new PowerSyncDatabase({
  schema: new Schema({...}),
  database: isWeb ? new WASQLiteOpenFactory({dbFilename: "mydb.sqlite"}) :
    new CapacitorSQLiteOpenFactory({dbFilename: "mydb.sqlite"})
});
```

## Platform Support

- **Android**: Uses native SQLite via Capacitor Community SQLite.
- **iOS**: Uses native SQLite via Capacitor Community SQLite.
- **Web**: Uses WASQLite via the PowerSync Web SDK.
- **Electron**: Uses WASQLite via the PowerSync Web SDK.

## Limitations

- Encryption for native mobile platforms is not yet supported.
- `PowerSyncDatabase.executeRaw` does not support results where multiple columns would have the same name in SQLite
- `PowerSyncDatabase.execute` has limited support on Android. The SQLCipher Android driver exposes queries and executions as separate APIs, so there is no single method that handles both. While `PowerSyncDatabase.execute` accepts both, on Android we treat a statement as a query only when the SQL starts with `select` (case-insensitive). Queries such as `INSERT into customers (id, name) VALUES (uuid(), 'name') RETURNING *` do not work on Android.
- Multiple tab support is not available for native Android and iOS targets. If you're not opening a second webview in your native app using something like `@jackobo/capacitor-webview`, you are unaffected by this.

## Examples

See the [`demos/example-capacitor/`](https://github.com/journeyapps/powersync-react-native-sdk/blob/main/demos/example-capacitor/README.md#L1) directory for a working example.

## Found a bug or need help?

- Join our [Discord server](https://discord.gg/powersync) to ask questions or share feedback.
- Open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues) for bugs.
- Submit ideas via our [public roadmap](https://roadmap.powersync.com/tabs/5-roadmap/submit-idea) or [schedule a chat](https://calendly.com/powersync-product/powersync-chat).
