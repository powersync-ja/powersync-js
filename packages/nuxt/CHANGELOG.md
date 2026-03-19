# @powersync/nuxt

## 0.0.5

### Patch Changes

- 8f8ef1c: Remove `async-mutex` dependency in favor of internal implementation.
- Updated dependencies [8f8ef1c]
  - @powersync/web@1.37.0
  - @powersync/vue@0.5.0
  - @powersync/kysely-driver@1.3.3

## 0.0.4

### Patch Changes

- 2f6d9c8: Updated readme.
- Updated dependencies [6c855cd]
  - @powersync/web@1.35.0
  - @powersync/vue@0.5.0
  - @powersync/kysely-driver@1.3.3

## 0.0.3

### Patch Changes

- 0c476f8: Updated readme note to include alpha state.

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
