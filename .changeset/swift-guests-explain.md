---
'@powersync/react': minor
---

- Added the ability to limit re-renders by specifying a `comparator` for query results. The `useQuery` hook will only emit `data` changes when the data has changed.

```javascript
// The data here will maintain previous object references for unchanged items.
const { data } = useQuery('SELECT * FROM lists WHERE name = ?', ['aname'], {
  comparator: {
    keyBy: (item) => item.id,
    compareBy: (item) => JSON.stringify(item)
  }
});
```

- Added the ability to subscribe to an existing instance of a `WatchedQuery`

```jsx
import { useWatchedQuerySubscription } from '@powersync/react';

const listsQuery = powerSync
  .query({
    sql: `SELECT * FROM lists`
  })
  .differentialWatch();

export const ListsWidget = (props) => {
  const { data: lists } = useWatchedQuerySubscription(listsQuery);

  return (
    <div>
      {lists.map((list) => (
        <div key={list.id}>{list.name}</div>
      ))}
    </div>
  );
};
```
