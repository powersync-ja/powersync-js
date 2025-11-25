---
'@powersync/react-native': minor
'@powersync/common': minor
'@powersync/node': minor
'@powersync/web': minor
'@powersync/capacitor': minor
---

Added ability to specify `appMetadata` for sync/stream requests

```javascript
powerSync.connect(connector, {
  // This will be included in PowerSync service logs
  appMetadata: {
    app_version: MY_APP_VERSION
  }
});
```
