<script setup lang="ts">
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui';

/**
 * A small hover label for icon-only controls. Renders through a portal so it is not clipped by the
 * toolbar, and needs a `TooltipProvider` above it (the panel root provides one).
 */
withDefaults(
  defineProps<{
    text: string;
    side?: 'top' | 'right' | 'bottom' | 'left';
  }>(),
  { side: 'bottom' }
);
</script>

<template>
  <TooltipRoot :delay-duration="300">
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipPortal>
      <TooltipContent
        :side="side"
        :side-offset="6"
        :collision-padding="8"
        class="z-50 max-w-64 rounded-md border bg-card px-2 py-1 text-xs leading-snug text-card-foreground shadow-md"
      >
        {{ text }}
        <TooltipArrow class="fill-card stroke-border" :width="10" :height="5" />
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
