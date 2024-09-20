---
'@powersync/common': patch
'@powersync/web': patch
'@powersync/react-native': patch
---

Fixed issue where sequentially mutating the same row multiple times could cause the CRUD upload queue monitoring to think CRUD operations have not been processed correctly by the `BackendConnector` `uploadData` method.
