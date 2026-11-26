---
'@powersync/shared-internals': patch
---

Reconnect when an HTTP sync stream receives nothing for 30 seconds. The service sends a keepalive line every 20 seconds, so a stream that died without closing (e.g. after a network change) was reported as `connected` indefinitely. WebSocket connections already used the same timeout.
