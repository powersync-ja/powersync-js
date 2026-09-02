<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '../../lib/utils';

const props = withDefaults(
  defineProps<{ variant?: 'default' | 'success' | 'warning' | 'destructive' | 'muted' | 'outline' }>(),
  { variant: 'default' }
);

const variantClass = computed(
  () =>
    ({
      default: 'bg-primary text-primary-foreground',
      success: 'bg-success/15 text-success',
      warning: 'bg-warning/20 text-[color:var(--warning)]',
      destructive: 'bg-destructive/15 text-destructive',
      muted: 'bg-muted text-muted-foreground',
      outline: 'border text-foreground'
    })[props.variant]
);
</script>

<template>
  <span :class="cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', variantClass)">
    <slot />
  </span>
</template>
