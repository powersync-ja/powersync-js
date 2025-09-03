---
'@powersync/react': patch
---

Fixed issue where `useQuery()` would not correctly trigger a new execution when the query or parameters changed while using StrictMode.
