# Vue composables for PowerSync

## Setup
To set up app-wide accessibility of PowerSync composables, create a PowerSync Vue plugin that configures a PowerSync instance and integrates it with the Vue instance. This approach provides the PowerSync client app wide so that any composable used has access to the instance.

```Typescript
// main.ts
import { createApp } from 'vue'
import App from './App.vue'
import { createPowerSync } from '@journeyapps/powersync-vue'

const db = // Setup PowerSync client

const app = createApp(App);
const powerSync = createPowerSync({database: db});

app.use(powerSync);
app.mount('#app');
```

### Overriding the PowerSync instance
The `createPowerSync` function is designed for setting up a PowerSync client that is available across your entire Vue application. It's the recommended approach for package setup. However, there may be situations where an app-wide setup isn't suitable, or you need a different PowerSync client for specific parts of your application.

In these cases, you can use the `providePowerSync` function within a parent component to override the PowerSync instance for all its descendant components. This allows for more granular control over the which PowerSync client is used in different sections of your application. `providePowerSync` can be utilized regardless of whether `createPowerSync` has been used globally. If there are multiple uses of `providePowerSync` within a component hierarchy, the closest `providePowerSync` call to the composable invocation will determine the PowerSync instance used.

Both `createPowerSync` and `providePowerSync` leverage Vue's [provide/inject mechanism](https://vuejs.org/guide/components/provide-inject) to ensure clients are available to the composables.


```Vue
// Container.vue
<script setup lang="ts">
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
<script setup lang="ts">
import { usePowerSync } from '@journeyapps/powersync-vue';
import { ref } from 'vue';

const powersync = usePowerSync();
const list = ref<any[]>([]);
powersync.value.getAll('SELECT * from lists').then((l: any[]) => list.value = l);
</script>

<template>
    <ul>
        <li v-for="l in list" :key="l.id">{{ l.name }}</li>
    </ul>
</template>
```

### Queries
The `usePowerSyncQuery` composable provides a static view of a given query, but can you use refs as parameters instead to automatically refresh the query when they change. The composable exposes reactive variables for the results, the error state, loading state, and a refresh callback that can be invoked to rerun the query manually.

```Vue
// TodoListDisplayQuery.vue
<script setup lang="ts">
import { usePowerSyncQuery } from '@journeyapps/powersync-vue';
import { ref } from 'vue';

const query = ref('SELECT * from lists');
const { data: list, error, loading, refresh} = usePowerSyncQuery(query);
</script>

<template>
    <input v-model="query" />
    <ul>
        <li v-for="l in list" :key="l.id">{{ l.name }}</li>
    </ul>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <button @click="refresh">Refresh</button>
</template>
```

### Watched Queries
The `usePowerSyncWatchedQuery` composable provides a dynamic view of a given query, the data will automatically update when a dependant table is updated. 

You use refs as parameters to refresh the query when they change. The composable exposes reactive variables for the results and the error state.

```Vue
// TodoListDisplayWatchedQuery.vue
<script setup lang="ts">
import { usePowerSync, usePowerSyncWatchedQuery } from '@journeyapps/powersync-vue';
import { ref } from 'vue';

const query = ref('SELECT * from lists');
const { data: list, error} = usePowerSyncWatchedQuery(query);

const powersync = usePowerSync();
const addList = () => {
    powersync.value.execute('INSERT INTO lists (id, name) VALUES (?, ?)', [Math.round(Math.random() * 1000), 'list name']);
}
</script>

<template>
    <input v-model="query" />
    <ul>
        <li v-for="l in list" :key="l.id">{{ l.name }}</li>
    </ul>
    <div v-if="error">{{ error }}</div>
    <button @click="addList">Add list</button>
</template>
```

## Important Usage Guidelines for PowerSync Composables
### Top-level setup block
The `usePowersync`, `usePowerSyncQuery`, and `usePowerSyncWatchedQuery` composables are meant to be invoked in the top-level setup block. Vue expects certain Composition API functions, like `inject` which this package depends on, to be resolved in the setup context and not inside nested or asynchronous functions. For use cases where you need to do this, you should access the PowerSync `AbstractPowerSyncDatabase` instance directly - like exporting it as singleton after configuring Vue with it in `main.ts`.

Incorrect Usage Example:
Using powerSync composables in a nested function of a component.

```typescript
<script setup lang="ts">
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

```typescript
<script setup lang="ts">
import { usePowerSync } from '@journeyapps/powersync-vue';

// ✅ Correct: usePowerSync initialized at the top level of setup function and used as a variable.
const powerSync = usePowerSync();

const exampleFunction = async () => {
  const result = await powerSync.value.getAll("select * from test");
  console.log(result);
}
</script>
```