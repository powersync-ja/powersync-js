---
'@journeyapps/powersync-sdk-common': patch
---

Fixed table change updates to be throttled and flushed on the trailing edge to avoid race conditions in watched queries.
