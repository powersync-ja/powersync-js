---
"@powersync/web": patch
---

Defer dedicated OPFS worker termination on pagehide until open completes and ignore repeat pagehide events to avoid lock leaks.
