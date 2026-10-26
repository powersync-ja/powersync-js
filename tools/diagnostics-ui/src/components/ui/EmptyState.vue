<script setup lang="ts">
import { computed, type Component } from 'vue';

const props = withDefaults(
  defineProps<{
    icon?: Component;
    title: string;
    description?: string;
    tone?: 'muted' | 'warning' | 'error';
    spin?: boolean;
  }>(),
  { tone: 'muted' }
);

const iconClass = computed(
  () =>
    ({
      muted: 'text-muted-foreground/40',
      warning: 'text-warning',
      error: 'text-destructive'
    })[props.tone]
);
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
    <component :is="icon" v-if="icon" :class="['size-10 shrink-0', iconClass, spin && 'animate-spin']" />
    <div class="space-y-1">
      <h2 class="text-sm font-semibold text-foreground">{{ title }}</h2>
      <p v-if="description" class="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.default" class="w-full max-w-md"><slot /></div>
  </div>
</template>
