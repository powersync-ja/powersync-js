---
'@powersync/shared-internals': minor
'@powersync/react-native': minor
'@powersync/capacitor': minor
'@powersync/common': minor
'@powersync/node': minor
'@powersync/nuxt': minor
'@powersync/web': minor
---

Add `requestCheckpoint()` to `PowerSyncDatabase` to request an explicit sync acknowledgement.
This feature requires a new `checkpointMode: 'requests'` option on `ConnectOptions` switching to a more
efficient way to request checkpoints from the PowerSync service.

For more details on this feature, see [Sync Catch-Up](https://docs.powersync.com/client-sdks/advanced/checkpoint-requests).
