---
'@powersync/nuxt': patch
---

Expose Sync Streams comosable to use in Nuxt with auto-imports

Example:

```
<script setup lang="ts">
// useSyncStream is auto-imported in Nuxt
const streamName = ref('my-stream');
const { status } = useSyncStream(streamName, { parameters: { id: 'abc' } });
</script>

<template>
  <div v-if="status?.hasSynced">Stream ready</div>
  <div v-else>Syncing...</div>
</template>
```
