<p align="center">
  <a href="https://www.powersync.com" target="_blank"><img src="https://github.com/powersync-ja/.github/assets/7372448/d2538c43-c1a0-4c47-9a76-41462dba484f"/></a>
</p>

_[PowerSync](https://www.powersync.com) is a sync engine for building local-first apps with instantly-responsive UI/UX and simplified state transfer. Syncs between SQLite on the client-side and Postgres, MongoDB, MySQL or SQL Server on the server-side._

# PowerSync Tauri SDK

> [!NOTE]
> This SDK is currently in an [alpha state](https://docs.powersync.com/resources/feature-status), intended for external testing and public feedback. While this SDK exposes the same stable JavaScript APIs as our other JavaScript SDKs, it is based on our Rust SDK which is also in an alpha state. The Rust layer and the IPC protocol between the JS and Rust packages are subject to change.
> Expect breaking changes and instability as development continues.

The PowerSync Tauri SDK (the `@powersync/tauri-plugin` package for JavaScript and the `tauri-plugin-powersync` crate) enable you to use PowerSync in Tauri (v2) apps.

For detailed usage instructions, see the full SDK reference [here](https://docs.powersync.com/client-sdks/reference/tauri).

## Installation

To use this package, add `@powersync/tauri-plugin` using your favorite package management tool for JavaScript. Also use `cargo add tauri-plugin-powersync` in your `src-tauri` to add required native sources.

In `src-tauri/capabilities/default.json`, ensure `powersync:default` is listed under `permissions` to make PowerSync APIs available to JavaScript.

In your `lib.rs`, ensure the plugin is loaded:

```diff
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![connect])
+       .plugin(tauri_plugin_powersync::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Once your native code is ready, create a new `PowerSyncTauriDatabase` with a schema to start using PowerSync:

```TypeScript
import { column, Schema, Table } from '@powersync/common';
import { PowerSyncTauriDatabase } from '@powersync/tauri-plugin';
import { appDataDir } from '@tauri-apps/api/path';

const lists = new Table({
  created_at: column.text,
  name: column.text
});

const schema = new Schema({ lists });

const db = new PowerSyncTauriDatabase({
  schema,
  database: {
    dbFilename: 'app.db',
    dbLocationAsync: appDataDir,
  }
});
```

## Sharing databases

Multiple Tauri windows opening the same `PowerSyncTauriDatabase` (as identified by its file name) will share the same underlying database.
Watched queries, table updates and the sync status are shared between all of them.

After a `PowerSyncTauriDatabase` has been initialized (await `.init()` to be sure), a database opened in JavaScript can also be shared with your Rust code.

For that, use the `PowerSyncTauriDatabase.rustHandle` getter and pass the returned integer to one of your Tauri commands. That command can recover the underlying database, and use all full Rust SDK APIs on it:

```Rust
#[tauri::command]
async fn connect<R: Runtime>(
    app: AppHandle<R>,
    handle: usize,
) -> tauri_plugin_powersync::Result<()> {
    let ps = app.powersync();
    let database = ps.database_from_javascript_handle(handle)?;

    let options = SyncOptions::new(MyRustConnector {
        db: database.clone(),
    });
    // Connect the database opened in JavaScript using the PowerSync Rust SDK.
    database.connect(options).await;

    Ok(())
}
```

## Demos

For a simple example app using Tauri, check out the [demos/tauri-app](../../demos/tauri-app/) demo.

## Current limitations

- Connecting to the PowerSync service is only possible from Rust.
  Calling `connect()` from JavaScript will throw.
- For sync status updates, `lastSyncedAt`, `hasSynced` and `priorityStatusEntries` are unavailable. Use the status from Sync Streams instead.

## Found a bug or need help?

- Join our [Discord server](https://discord.gg/powersync) where you can browse topics from our community, ask questions, share feedback, or just say hello :)
- Please open a [GitHub issue](https://github.com/powersync-ja/powersync-js/issues) when you come across a bug.
- Have feedback or an idea? [Submit an idea](https://roadmap.powersync.com/tabs/5-roadmap/submit-idea) via our public roadmap or [schedule a chat](https://calendly.com/powersync-product/powersync-chat) with someone from our product team.
