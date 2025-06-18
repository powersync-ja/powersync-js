---
'@powersync/common': minor
'@powersync/node': minor
'@powersync/web': minor
'@powersync/react-native': minor
---

This adds a new (and currently experimental) sync client implementation
implemented natively in the PowerSync SQLite extension.

This implementation will eventually become the default, but we encourage
interested users to try it out. In particular, we expect that it can improve
sync performance (especially on platforms with challenging JS performance,
like React Native).

On all our JavaScript SDKs, the new implementation can be enabled with a
sync option entry when connecting:

```JS
await db.connect(new MyConnector(), {
  clientImplementation: SyncClientImplementation.RUST
});
```

Since the new client implements the same protocol, you can also migrate back
to the JavaScript client later by removing the `clientImplementation` option.

__However__: After enabling the `RUST` client, you cannot downgrade your 
PowerSync SDK below this version. When enabled for the first time, databases
will be migrated. The JavaScript sync client from this and later SDK versions
understands the new format, but the client from an older SDK version will not!
