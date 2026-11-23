---
'@powersync/shared-internals': patch
---

Fix checkpoint requests failing with a stale "Closing sync stream network requests before retry." error after a stream subscription restarts the download iteration. Closes https://github.com/powersync-ja/powersync-js/issues/1225.
