---
'@powersync/react-native': patch
---

Send a `User-Agent` header on the WebSocket handshake used for sync connections, matching the Node.js SDK. This fixes connections to self-hosted PowerSync service deployments behind proxies or WAF rules that reject requests without a `User-Agent` header.
