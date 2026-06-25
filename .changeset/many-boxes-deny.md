---
'@powersync/web': major
---

To reduce setup complexity, the database and sync workers have moved to a single file.

The UMD build for the main library has been removed, import `@powersync/web` directly and
remove import mappings pointing to `@powersync/web/umd`.

If you were using the pre-bundled sync or web workers, run `powersync-web copy-assets` again
and update URLs from `/@powersync/worker/WASQLiteDB.umd.js` and `/@powersync/worker/SharedSyncImplementation.umd.js` to `/@powersync/worker.js`.
