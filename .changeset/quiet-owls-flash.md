---
'@powersync/react-native': minor
'@powersync/common': minor
'@powersync/node': minor
'@powersync/web': minor
'@powersync/capacitor': minor
---

Added ability to specify `appMetadata` for sync/stream requests.

Note: This requires a PowerSync service version `>=1.17.0` in order for logs to display metadata.

```javascript
powerSync.connect(connector, {
  // This will be included in PowerSync service logs
  appMetadata: {
    app_version: MY_APP_VERSION
  }
});
```
