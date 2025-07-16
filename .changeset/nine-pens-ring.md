---
'@powersync/vue': minor
---

[Potentially breaking change] The `useQuery` hook results are now explicitly defined as readonly. These values should not be mutated.

- Added the ability to limit re-renders by specifying a `differentiator` for query results. The `useQuery` hook will only emit `data` changes when the data has changed.

```javascript
// The data here will maintain previous object references for unchanged items.
const { data } = useQuery('SELECT * FROM lists WHERE name = ?', ['aname'], {
  differentiator: {
    identify: (item) => item.id,
    compareBy: (item) => JSON.stringify(item)
  }
});
```
