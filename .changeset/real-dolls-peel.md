---
'@powersync/common': patch
---

Improved the abort handling for stale watched query results when the query/parameters change. This fixes the edge case where an already fetching query would handle a query change and briefly report `isFetching` being false before becoming true again.
