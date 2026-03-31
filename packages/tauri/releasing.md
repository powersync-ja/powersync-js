The `@powersync/tauri-plugin` npm package is versioned through changesets.

The version of the `tauri-plugin-powersync` crate is also managed by changesets,
but we can't reliably publish to crates.io through that automation.

If the Rust crate should get published, manually run the "Release tauri plugin crate"
workflow on a `tauri-plugin-powersync@<version>` tag created by changesets.
