<script setup lang="ts">
import type { Component } from 'vue';
import CopyButton from './CopyButton.vue';

withDefaults(
  defineProps<{
    icon?: Component;
    label: string;
    value?: string | number | null;
    mono?: boolean;
    copyable?: boolean;
  }>(),
  { mono: false, copyable: false }
);
</script>

<template>
  <div class="flex items-center gap-2 px-3 py-1.5 text-xs">
    <component :is="icon" v-if="icon" class="size-3.5 shrink-0 text-muted-foreground" />
    <span class="w-24 shrink-0 text-muted-foreground">{{ label }}</span>
    <span
      :class="['min-w-0 flex-1 truncate text-foreground', mono && 'font-mono']"
      :title="value != null ? String(value) : undefined"
    >
      <slot>{{ value ?? '—' }}</slot>
    </span>
    <CopyButton v-if="copyable" :value="value != null ? String(value) : null" />
  </div>
</template>
