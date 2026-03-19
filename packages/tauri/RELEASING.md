The JavaScript package (`@powersync/tauri-plugin`) should _only_ be released through changesets.

We don't want to publish the Rust crate every time we update the JavaScript package though:

1. Most of the time, updates to JS are just forwarded updates from `@powersync/common` that don't affect Rust at all.
2. We can't easily integrate Cargo publishing into changesets.
3. Since the Cargo and npm dependencies for users are different, there's no way to actually ensure compatible versions of
   the crate and the JS package are used in apps.

Especially due to reason 3, the Rust release process is more involved. The basic outline is:

1. If we update parameters of the powersync Tauri command in a backwards-incompatible way, we need a major/breaking update of the JavaScript package as well.
2. The Rust crate is updated independently by tagging and pushing `tauri-plugin-powersync-vx.y.z` (e.g. `tauri-plugin-powersync-v0.1.0`).
