---
'@powersync/react-native': minor
'@powersync/common': minor
---

Introduced `fetchStrategy` option to connect, allowing you to choose either `buffered` or `sequential` for the Websocket connect option. Internally the functionality of `buffered` was used by default, but now it can be switched to the sequential mode. This changes the WebSocket sync queue to only process one sync event at a time, improving known keep-alive issues for lower-end hardware with minimal impact on sync performance.
