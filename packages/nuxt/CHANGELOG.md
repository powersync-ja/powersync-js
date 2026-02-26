# @powersync/nuxt

## 0.0.2

### Patch Changes

- 3807514: Expose Sync Streams comosable to use in Nuxt with auto-imports

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

- Updated dependencies [fd7f387]
  - @powersync/vue@0.5.0

## 0.0.1

### Patch Changes

- fb19f01: Initial release of the PowerSync Nuxt module. Provides Nuxt Devtools integration, built-in diagnostics and data inspection, and composables. Supports Nuxt 4.
