<template>
  <div class="mt-0 mb-6">
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

const loadingMessage = computed(() => (props.loading ? 'Busy with initial sync' : 'Re-executing query'));
</script>
