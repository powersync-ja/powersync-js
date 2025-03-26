---
'@powersync/web': minor
---

Navigator locks are now aquired with a random/unique key.

This resolves an issue related to sequential `connect()` calls breaking all syncing and never reaching a `connected` state.
Two typical scenarios that can cause this is switching client parameters and React's `StrictMode` which does multiple calls of hooks like `useEffect`.
