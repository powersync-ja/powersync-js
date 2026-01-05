---
"@powersync/web": patch
---

Avoid binding `this` when disposing table change listeners in the web adapter to prevent Comlink serialization errors on close.
