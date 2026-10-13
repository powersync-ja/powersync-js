---
'@powersync/diagnostics': patch
---

Add the `@powersync/diagnostics/agent` entry for a host that opens the database and embeds the DevTools page itself: `createIntegration`, with a `reset` option that answers `clearData` by replacing the database, and `attachIframe`.
