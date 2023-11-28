---
'@journeyapps/powersync-sdk-common': patch
---

- The SyncStatus now includes the state of if the connector is uploading or downloading data.
- Crud uploads are now debounced.
- Crud uploads now are also triggered on `execute` method calls.
- Database name is now added to the `DBAdapter` interface for better identification in locks (for Web SDK)
- Failed crud uploads now correctly throw errors, to be caught upstream, and delayed for retry.