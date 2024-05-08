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
import { useStatus } from '@powersync/vue';
import { ref } from 'vue';
import { watchEffect } from 'vue';
import { computed } from 'vue';

const status = useStatus();

const props = defineProps({
  isLoading: Boolean,
  isFetching: Boolean
});

let dispose: (() => void) | undefined = undefined;
const showLoadingMessage = ref(false);

watchEffect(() => {
  if (props.isFetching || props.isLoading || !status.value.hasSynced) {
    if (!dispose) {
      const timeout = setTimeout(() => {
        showLoadingMessage.value = true;
      }, 300);

      dispose = () => clearTimeout(timeout);
    }
  } else {
    dispose?.();
    dispose = undefined;

    showLoadingMessage.value = false;
  }
});

const loadingMessage = computed(() => (props.isLoading ? 'Loading' : 'Re-executing query'));
</script>
