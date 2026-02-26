---
'@powersync/vue': minor
---

Add support for Sync Streams for Vue

Subscribing to a sync stream and using its status:

```
<script setup>
import { useSyncStream } from '@powersync/vue';


const { status } = useSyncStream('my-stream', { parameters: { userId: 'user-123' } });

// both the name and parameters can be reactive
const streamName = ref('my-stream')
const streamOptions = ref({ parameters: { userId: 'user-123' } })

useSyncStream(streamName, streamOptions);
</script>

<template>
  <div v-if="status">
    <span v-if="status.hasSynced">Stream synced</span>
    <span v-else>Syncing...</span>
  </div>
</template>
```

Running a query backed by sync streams:

```
<script setup>
import { useQuery } from '@powersync/vue';

// Subscribe to streams; query runs immediately
const { data } = useQuery('SELECT * FROM lists', [], {
  streams: [{ name: 'lists-stream' }]
});

// Or wait for the stream to sync before showing results
const { data: lists, isLoading } = useQuery('SELECT * FROM lists', [], {
  streams: [{ name: 'lists-stream', waitForStream: true }]
});
</script>
```
