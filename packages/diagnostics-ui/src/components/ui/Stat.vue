<script setup lang="ts">
defineProps<{ label: string; value: string | number; hint?: string }>();
</script>

<template>
  <div class="rounded-lg border bg-card p-3">
    <div class="text-xs text-muted-foreground">{{ label }}</div>
    <div class="mt-1 text-lg font-semibold tabular-nums">{{ value }}</div>
    <div v-if="hint" class="mt-0.5 text-xs text-muted-foreground">{{ hint }}</div>
  </div>
</template>
