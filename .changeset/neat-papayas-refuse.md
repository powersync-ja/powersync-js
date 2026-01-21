---
'@powersync/common': minor
'@powersync/node': minor
'@powersync/react-native': minor
'@powersync/web': minor
---

The [Rust sync client](https://www.powersync.com/blog/speeding-up-powersync-with-a-sqlite-extension-written-in-rust) is now enabled by default.
To keep using the JavaScript client implementation, pass `clientImplementation: SyncClientImplementation.JAVASCRIPT` in `options` when calling
`PowerSync.connect`.

Note that the JavaScript client will be removed in a future version of the SDK. If you choose to it due to issues with the Rust client, please
file an issue or reach out to us.
