---
'@powersync/node': minor
---

Switch to undici WebSocket for Dispatcher and diagnostics_channel support. This now adds support for the `ALL_PROXY` environment variable by default, as well as `WSS_PROXY` for websocket connections.
