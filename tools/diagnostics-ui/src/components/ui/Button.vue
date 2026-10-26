<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '../../lib/utils';

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'md';
    disabled?: boolean;
  }>(),
  { variant: 'default', size: 'md', disabled: false }
);

const variantClass = computed(
  () =>
    ({
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      outline: 'border bg-transparent hover:bg-accent hover:text-accent-foreground',
      ghost: 'bg-transparent hover:bg-accent hover:text-accent-foreground',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
    })[props.variant]
);

const sizeClass = computed(() => ({ sm: 'h-7 px-2 text-xs', md: 'h-9 px-3 text-sm' })[props.size]);
</script>

<template>
  <button
    :disabled="disabled"
    :class="
      cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variantClass,
        sizeClass
      )
    "
  >
    <slot />
  </button>
</template>
