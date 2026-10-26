<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ op: string | null }>();

// Light tints (like the streams "active" badge): create=blue, update=orange, delete=red.
const cls = computed(() => {
  switch ((props.op ?? '').toUpperCase()) {
    case 'PUT':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
    case 'PATCH':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
    case 'DELETE':
      return 'bg-red-500/15 text-red-600 dark:text-red-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
});
</script>

<template>
  <span :class="['inline-block rounded px-1 py-0.5 text-center font-mono text-[10px] font-medium uppercase', cls]">
    {{ op ?? '—' }}
  </span>
</template>
