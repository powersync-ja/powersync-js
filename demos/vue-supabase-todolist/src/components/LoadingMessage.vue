<template>
  <div
    v-if="showLoadingMessage"
    class="mt-0 mb-6 d-flex align-center"
    style="position: absolute; top: 68px; left: 45%; z-index: 100"
  >
    <v-progress-circular class="mr-4" indeterminate color="primary" />

    <div v-if="!status.hasSynced">Busy with initial sync...</div>
    <v-tooltip v-else :text="loadingMessage">
      <template v-slot:activator="{ props }"> <v-icon v-bind="props">mdi-information</v-icon> </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { usePowerSyncStatus } from '@journeyapps/powersync-vue';
import { ref } from 'vue';
import { watchEffect } from 'vue';
import { computed } from 'vue';

const { status } = usePowerSyncStatus();

const props = defineProps({
  loading: Boolean,
  fetching: Boolean
});

let dispose = () => {};
const showLoadingMessage = ref(false);

watchEffect(() => {
  dispose();

  if (props.fetching || props.loading || !status.value.hasSynced) {
    const timeout = setTimeout(() => {
      showLoadingMessage.value = true;
    }, 300);

    dispose = () => clearTimeout(timeout);
  } else {
    showLoadingMessage.value = false;
  }
});

const loadingMessage = computed(() => (props.loading ? 'Loading' : 'Re-executing query'));
</script>
