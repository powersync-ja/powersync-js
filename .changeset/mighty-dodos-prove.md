---
'@powersync/shared-internals': patch
'@powersync/web': minor
---

When shared sync workers are disabled, use broadcast channels to share the current sync status and
subscriptions across tabs.
