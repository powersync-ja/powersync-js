# Vue composables for PowerSync

The `powersync/vue` package is a Vue-specific wrapper for PowerSync. It provides Vue composables that are designed to support reactivity, and can be used to automatically re-render components when query results update or to access PowerSync connectivity status changes.

## Note: Beta Release

This package is currently in a beta release.

## Setup

To set up app-wide accessibility of PowerSync composables, create a PowerSync Vue plugin that configures a PowerSync instance and integrates it with the Vue instance.

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import { createPowerSyncPlugin } from '@powersync/vue'

const db = // Setup PowerSync client

const app = createApp(App);
const powerSyncPlugin = createPowerSyncPlugin({database: db});

app.use(powerSyncPlugin);
app.mount('#app');
```

## Overriding the PowerSync instance

The `createPowerSyncPlugin` function is designed for setting up a PowerSync client that is available across your entire Vue application. It's the recommended approach for package setup. However, there may be situations where an app-wide setup isn't suitable, or you need a different PowerSync client for specific parts of your application.

In these cases, you can use the `providePowerSync` function within a parent component to override the PowerSync instance for all its descendant components. This allows for more granular control over which PowerSync client is used in different sections of your application. `providePowerSync` can be utilized regardless of whether `createPowerSyncPlugin` has been used globally. If there are multiple uses of `providePowerSync` within a component hierarchy, the closest `providePowerSync` call to the composable invocation will determine the PowerSync instance used.

Both `createPowerSyncPlugin` and `providePowerSync` leverage Vue's [provide/inject mechanism](https://vuejs.org/guide/components/provide-inject) to ensure clients are available to the composables.

```Vue
// Container.vue
<script setup>
import { providePowerSync } from '@powersync/vue'

const db = // Setup PowerSync client

// all descendant components will access this client when using the composables
providePowerSync(db);
</script>
```

## Accessing PowerSync

The provided PowerSync client is available with the `usePowerSync` composable.

```Vue
// TodoListDisplay.vue
<script setup>
import { usePowerSync } from '@powersync/vue';
import { ref } from 'vue';

const powersync = usePowerSync();
const list = ref([]);
powersync.value.getAll('SELECT * from lists').then((l) => list.value = l);
</script>

<template>
    <ul>
        <li v-for="l in list" :key="l.id">{{ l.name }}</li>
    </ul>
</template>
```

## Reactive Query

The `useQuery` composable provides a dynamic view of a given query. The data will automatically update when a dependent table is updated.

You can use refs as parameters to refresh the query when they change. The composable exposes reactive variables for the results as well as the loading, fetching, and and error states. Note that `isLoading` indicates that the initial result is being retrieved and `isFetching` indicates the query is fetching data, which could be for the initial load or any time when the query is re-evaluating due to a change in a dependent table.

```Vue
// TodoListDisplayQuery.vue
<script setup>
import { usePowerSync, useQuery } from '@powersync/vue';
import { ref } from 'vue';

const query = ref('SELECT * from lists');
const { data:list, isLoading, isFetching, error} = useQuery(query);

const powersync = usePowerSync();
const addList = () => {
    powersync.value.execute('INSERT INTO lists (id, name) VALUES (?, ?)', [Math.round(Math.random() * 1000), 'list name']);
}
</script>

<template>
    <input v-model="query" />
    <div v-if="isLoading">Loading...</div>
    <div v-else-if="isFetching">Updating results...</div>

    <div v-if="error">{{ error }}</div>
    <ul v-else>
        <li v-for="l in list" :key="l.id">{{ l.name }}</li>
    </ul>
    <button @click="addList">Add list</button>
</template>
```

### Static query

The `useQuery` composable can be configured to only execute initially and not every time changes to dependent tables are detected. The query can be manually re-executed by using the returned `refresh` function.

```Vue
// TodoListDisplayStaticQuery.vue
<script setup>
import { useQuery } from '@powersync/vue';

const { data: list, refresh } = useQuery('SELECT id, name FROM lists', [], {
  runQueryOnce: true
});
</script>

<template>
  <ul>
    <li v-for="l in list" :key="l.name">{{ l.name }} + {{ l.id }}</li>
  </ul>
  <button @click="refresh">Refresh list</button>
</template>

```

### TypeScript Support

A type can be specified for each row returned by `useQuery`. Remember to declare `lang="ts"` when defining a `script setup` block.

```Vue
// TodoListDisplayStaticQueryTypeScript.vue
<script setup lang="ts">
import { useQuery } from '@powersync/vue';

const { data } = useQuery<{ id: string, name: string }>('SELECT id, name FROM lists');
</script>

<template>
   <ul>
       <li v-for="l in data" :key="l.id">{{ l.name }}</li>
   </ul>
</template>
```

You are also able to use a compilable query (e.g. [Kysely queries](https://github.com/powersync-ja/powersync-js/tree/main/packages/kysely-driver)) as a query argument in place of a SQL statement string.

```Vue
// TodolistDisplayQueryKysely.vue
<script setup lang="ts">
import { usePowerSync, useQuery } from '@powersync/vue';
import { wrapPowerSyncWithKysely } from '@powersync/kysely-driver';
import { Database } from '@/library/powersync/AppSchema';

const powerSync = usePowerSync();
const db = wrapPowerSyncWithKysely<Database>(powerSync.value);

const { data } = useQuery(db.selectFrom('lists').selectAll().where('name', 'like', '%Shopping%'));
</script>
```

## Connection Status

The `useStatus` composable provides general connectivity information such as the connection status, whether the initial full sync has completed, when the last sync completed, and whether any data is being uploaded or downloaded.

```Vue
// ConnectionStatus.vue
<script setup>
import { useStatus } from '@powersync/vue';

const status = useStatus();
</script>

<template>
  <div v-if="!status.hasSynced">Waiting for initial sync to complete.</div>
  <div v-else>
    <div>Connected: {{ status.connected }}, last synced at: {{ status.lastSyncedAt }}</div>
    <div v-if="status.dataFlowStatus.uploading">Uploading...</div>
    <div v-if="status.dataFlowStatus.downloading">Downloading...</div>
  </div>
</template>
```

## Important Usage Guidelines for PowerSync Composables

### Top-level setup block

The `usePowersync`, `useQuery`, and `useStatus` composables are meant to be invoked in the top-level setup block. Vue expects certain Composition API functions, like `inject` which this package depends on, to be resolved in the setup context and not inside nested or asynchronous functions. For use cases where you need to do this, you should access the PowerSync `AbstractPowerSyncDatabase` instance directly - like exporting it as singleton after configuring Vue with it in `main.js`.

Incorrect Usage Example:
Using PowerSync composables in a nested function of a component.

```javascript
<script setup>
import { usePowerSync } from '@powersync/vue';

const exampleFunction = async () => {
  // ❌ Incorrect: `usePowerSync()` called inside a nested function
  const result = await usePowerSync().value.getAll("select * from test");
  console.log(result);
}
</script>
```

Correct Usage Example:
It's important to initialize usePowerSync at the top level of your setup function and then use the assigned constant.

```javascript
<script setup>
import { usePowerSync } from '@powersync/vue';

// ✅ Correct: usePowerSync initialized at the top level of setup function and used as a variable.
const powerSync = usePowerSync();

const exampleFunction = async () => {
  const result = await powerSync.value.getAll("select * from test");
  console.log(result);
}
</script>
```
