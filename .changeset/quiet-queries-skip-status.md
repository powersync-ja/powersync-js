---
'@powersync/react': patch
---

Stop `useQuery` without `streams` from subscribing to the sync status, so it no longer re-renders on every status change. Closes https://github.com/powersync-ja/powersync-js/issues/1207.
