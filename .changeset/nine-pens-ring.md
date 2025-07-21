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

- Added the ability to subscribe to an existing instance of a `WatchedQuery`

```vue
<script setup>
import { useWatchedQuerySubscription } from '@powersync/vue';

const listsQuery = powerSync
  .query({
    sql: `SELECT * FROM lists`
  })
  .differentialWatch();

const { data, isLoading, isFetching, error } = useWatchedQuerySubscription(listsQuery);
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="isFetching">Updating results...</div>

  <div v-if="error">{{ error }}</div>
  <ul v-else>
    <li v-for="l in data" :key="l.id">{{ l.name }}</li>
  </ul>
</template>
```
