<template>
  <div class="mt-0 mb-6" style="position: absolute; top: 68px; left: 50%; z-index: 100">
    <v-progress-circular indeterminate color="primary" />

    <v-tooltip :text="loadingMessage">
      <template v-slot:activator="{ props }">
        <v-icon class="ml-4" v-bind="props">mdi-information</v-icon>
      </template>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  loading: Boolean,
  fetching: Boolean
});

const loadingMessage = computed(() => (props.loading ? 'Loading' : 'Re-executing query'));
</script>
