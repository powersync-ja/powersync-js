# Vue composables for PowerSync

## Note: Alpha Release

This package is currently in an alpha release.

## Setup

To set up app-wide accessibility of PowerSync composables, create a PowerSync Vue plugin that configures a PowerSync instance and integrates it with the Vue instance.

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import { createPowerSyncPlugin } from '@journeyapps/powersync-vue'

const db = // Setup PowerSync client

const app = createApp(App);
const powerSyncPlugin = createPowerSyncPlugin({database: db});

app.use(powerSyncPlugin);
app.mount('#app');
```

### Overriding the PowerSync instance

The `createPowerSyncPlugin` function is designed for setting up a PowerSync client that is available across your entire Vue application. It's the recommended approach for package setup. However, there may be situations where an app-wide setup isn't suitable, or you need a different PowerSync client for specific parts of your application.

In these cases, you can use the `providePowerSync` function within a parent component to override the PowerSync instance for all its descendant components. This allows for more granular control over which PowerSync client is used in different sections of your application. `providePowerSync` can be utilized regardless of whether `createPowerSyncPlugin` has been used globally. If there are multiple uses of `providePowerSync` within a component hierarchy, the closest `providePowerSync` call to the composable invocation will determine the PowerSync instance used.

Both `createPowerSyncPlugin` and `providePowerSync` leverage Vue's [provide/inject mechanism](https://vuejs.org/guide/components/provide-inject) to ensure clients are available to the composables.

```Vue
// Container.vue
<script setup>
import { providePowerSync } from '@journeyapps/powersync-vue'

const db = // Setup PowerSync client

// all descendant components will access this client when using the composables
providePowerSync(db);
</script>
```

### Accessing PowerSync

The provided PowerSync client is available with the `usePowerSync` composable.

```Vue
// TodoListDisplay.vue
<script setup>
import { usePowerSync } from '@journeyapps/powersync-vue';
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

### Queries

The `usePowerSyncQuery` composable provides a static view of a given query. You can use refs as parameters instead to automatically refresh the query when they change. The composable exposes reactive variables for the results, the loading state and error state, as well as a refresh callback that can be invoked to rerun the query manually.

```Vue
// TodoListDisplayQuery.vue
<script setup>
import { usePowerSyncQuery } from '@journeyapps/powersync-vue';
import { ref } from 'vue';

const query = ref('SELECT * from lists');
const { data: list, error, loading, refresh} = usePowerSyncQuery(query);
</script>

<template>
    <input v-model="query" />
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <ul v-else>
        <li v-for="l in list" :key="l.id">{{ l.name }}</li>
    </ul>
    <button @click="refresh">Refresh</button>
</template>
```

### Watched Queries

The `usePowerSyncWatchedQuery` composable provides a dynamic view of a given query. The data will automatically update when a dependent table is updated.

You can use refs as parameters to refresh the query when they change. The composable exposes reactive variables for the results as well as the loading, fetching, and and error states. Note that `loading` initicates that the initial result is being retrieved and `fetching` indicates the query is fetching data, which could be for the initial load or any time when the query is re-evaluating due to a change in a dependent table.

```Vue
// TodoListDisplayWatchedQuery.vue
<script setup>
import { usePowerSync, usePowerSyncWatchedQuery } from '@journeyapps/powersync-vue';
import { ref } from 'vue';

const query = ref('SELECT * from lists');
const { data: list, loading, fetching, error} = usePowerSyncWatchedQuery(query);

const powersync = usePowerSync();
const addList = () => {
    powersync.value.execute('INSERT INTO lists (id, name) VALUES (?, ?)', [Math.round(Math.random() * 1000), 'list name']);
}
</script>

<template>
    <input v-model="query" />
    <div v-if="loading">Loading...</div>
    <div v-else-if="fetching">Updating results...</div>

    <div v-if="error">{{ error }}</div>
    <ul v-else>
        <li v-for="l in list" :key="l.id">{{ l.name }}</li>
    </ul>
    <button @click="addList">Add list</button>
</template>
```

### Connection Status

The `usePowerSyncStatus` composable provides general connectivity information such as the connection status, whether the initial full sync has completed, when the last sync completed, and whether any data is being uploaded or downloaded.

```Vue
// ConnectionStatus.vue
<script setup>
import { usePowerSyncStatus } from '@journeyapps/powersync-vue';

const { status } = usePowerSyncStatus();
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

The `usePowersync`, `usePowerSyncQuery`, `usePowerSyncWatchedQuery`, and `usePowerSyncStatus` composables are meant to be invoked in the top-level setup block. Vue expects certain Composition API functions, like `inject` which this package depends on, to be resolved in the setup context and not inside nested or asynchronous functions. For use cases where you need to do this, you should access the PowerSync `AbstractPowerSyncDatabase` instance directly - like exporting it as singleton after configuring Vue with it in `main.js`.

Incorrect Usage Example:
Using PowerSync composables in a nested function of a component.

```javascript
<script setup>
import { usePowerSync } from '@journeyapps/powersync-vue';

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
import { usePowerSync } from '@journeyapps/powersync-vue';

// ✅ Correct: usePowerSync initialized at the top level of setup function and used as a variable.
const powerSync = usePowerSync();

const exampleFunction = async () => {
  const result = await powerSync.value.getAll("select * from test");
  console.log(result);
}
</script>
```
