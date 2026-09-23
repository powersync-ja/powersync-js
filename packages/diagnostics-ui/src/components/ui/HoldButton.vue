<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { cn } from '../../lib/utils';

/**
 * An icon button for a destructive action that fires only after the pointer (or Space/Enter) is
 * held for `duration`. A ring fills around the icon while holding; letting go early cancels.
 */
const props = withDefaults(
  defineProps<{
    /** How long the button must be held before it fires, in milliseconds. */
    duration?: number;
    disabled?: boolean;
    class?: string;
  }>(),
  { duration: 1000, disabled: false }
);

const emit = defineEmits<{ confirm: [] }>();

/** 0 while idle, 1 the moment the action fires. */
const progress = ref(0);
let frame = 0;
let startedAt = 0;

function tick(now: number) {
  progress.value = Math.min((now - startedAt) / props.duration, 1);
  if (progress.value < 1) {
    frame = requestAnimationFrame(tick);
    return;
  }
  reset();
  emit('confirm');
}

function start() {
  if (props.disabled || frame) return;
  startedAt = performance.now();
  frame = requestAnimationFrame(tick);
}

function reset() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  progress.value = 0;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
  event.preventDefault();
  start();
}

onBeforeUnmount(reset);

// The ring is a circle on a 24-unit viewBox; its dash offset shrinks from the full circumference to 0.
const RADIUS = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value));
const holding = computed(() => progress.value > 0);
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    :class="
      cn(
        'relative select-none rounded p-1 text-destructive/80 transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-50',
        holding && 'bg-destructive/15 text-destructive',
        props.class
      )
    "
    style="touch-action: none"
    @pointerdown.prevent="start"
    @pointerup="reset"
    @pointerleave="reset"
    @pointercancel="reset"
    @keydown="onKeyDown"
    @keyup="reset"
    @blur="reset"
    @contextmenu.prevent
  >
    <slot />
    <svg
      v-if="holding"
      class="pointer-events-none absolute inset-0 size-full -rotate-90"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        :r="RADIUS"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
  </button>
</template>
