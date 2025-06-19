---
'@powersync/vue': minor
---

- Added the ability to limit re-renders by specifying a `comparator` for query results. The `useQuery` hook will only emit `data` changes when the data has changed.

```javascript
 useQuery('SELECT * FROM lists WHERE name = ?', ['todo'], {
    // This will be used to compare result sets between internal queries
    comparator: new ArrayComparator({
        compareBy: (item) => JSON.stringify(item)
    })
}),
```
