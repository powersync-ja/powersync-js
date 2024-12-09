---
'@powersync/tanstack-react-query': minor
---

Changed how default query client is derived when not supplied as a function parameter. Fixes some cases where deriving the query client happens too early.
