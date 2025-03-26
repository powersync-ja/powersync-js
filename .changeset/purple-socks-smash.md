---
'@powersync/web': minor
---

Introduced functionality for releasing the navigator lock.
This resolves an issue related to sequential `connect()` calls breaking all syncing and never reaching a `connected` state. A typical error case was React's StrictMode which could trigger an `useEffect` which was calling `connect()` twice.
