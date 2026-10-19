---
'@powersync/diagnostics': patch
'@powersync/diagnostics-core': patch
---

Add the `@powersync/diagnostics/agent` entry for a host that opens the database and embeds the DevTools page itself: `createIntegration` and `attachIframe`. `attachIframe` now answers the page's port request instead of posting the port on load, which could reach the iframe's blank placeholder and be lost.
