<template>
  <div
    v-if="showLoadingMessage"
    class="mt-0 mb-6 d-flex align-center justify-center"
    style="position: absolute; top: 68px; left: 0%; right: 0; margin: auto; z-index: 100; width: 350px"
  >
    <v-progress-circular class="mr-4" indeterminate color="primary" />

    <div v-if="!status.hasSynced">Busy with initial sync...</div>
    <v-tooltip v-else :text="loadingMessage">
      <template v-slot:activator="{ props }"> <v-icon v-bind="props">mdi-information</v-icon> </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { usePowerSyncStatus } from '@powersync/vue';
import { ref } from 'vue';
import { watchEffect } from 'vue';
import { computed } from 'vue';

const { status } = usePowerSyncStatus();

const props = defineProps({
  loading: Boolean,
  fetching: Boolean
});

let dispose: (() => void) | undefined = undefined;
const showLoadingMessage = ref(false);

watchEffect(() => {
  if (props.fetching || props.loading || !status.value.hasSynced) {
    if (!dispose) {
      const timeout = setTimeout(() => {
        showLoadingMessage.value = true;
      }, 100);

      dispose = () => clearTimeout(timeout);
    }
  } else {
    dispose?.();
    dispose = undefined;

    showLoadingMessage.value = false;
  }
});

const loadingMessage = computed(() => (props.loading ? 'Loading' : 'Re-executing query'));
</script>
