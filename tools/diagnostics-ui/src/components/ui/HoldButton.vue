<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { cn } from '../../lib/utils';

/**
 * An icon button for a destructive action that fires only after the pointer (or Space/Enter) is
 * held for `duration`. A ring appears the moment the press starts and fills while holding; letting
 * go early cancels and shows a short "hold" hint, so a plain click is never silent.
 */
const props = withDefaults(
  defineProps<{
    /** How long the button must be held before it fires, in milliseconds. */
    duration?: number;
    /** The hint shown after a press that was released too early. */
    hint?: string;
    disabled?: boolean;
    class?: string;
  }>(),
  { duration: 1000, hint: 'Hold to confirm', disabled: false }
);

const emit = defineEmits<{ confirm: [] }>();
// The root is a wrapper for the hint; the button is the real control, so attributes (aria-label,
// tooltip trigger bindings) land on it.
defineOptions({ inheritAttrs: false });

/** `null` while idle; `0` to `1` while pressed. */
const progress = ref<number | null>(null);
const showHint = ref(false);
let frame = 0;
let startedAt = 0;
let hintTimer: ReturnType<typeof setTimeout> | null = null;

function tick(now: number) {
  progress.value = Math.min((now - startedAt) / props.duration, 1);
  if (progress.value < 1) {
    frame = requestAnimationFrame(tick);
    return;
  }
  stop();
  emit('confirm');
}

function start() {
  if (props.disabled || frame) return;
  hideHint();
  startedAt = performance.now();
  // Draw the empty ring right away, before the first animation frame.
  progress.value = 0;
  frame = requestAnimationFrame(tick);
}

/** Ends the press. A press that ends early was a click, not a hold: say so briefly. */
function release() {
  if (frame && progress.value !== null && progress.value < 1) {
    showHint.value = true;
    hintTimer = setTimeout(hideHint, 1500);
  }
  stop();
}

function stop() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  progress.value = null;
}

function hideHint() {
  if (hintTimer) clearTimeout(hintTimer);
  hintTimer = null;
  showHint.value = false;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
  event.preventDefault();
  start();
}

onBeforeUnmount(() => {
  stop();
  hideHint();
});

// The ring is a circle on a 24-unit viewBox; the filled arc's dash offset shrinks from the full
// circumference to 0. A faint full track underneath shows the target from the first frame.
const RADIUS = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const dashOffset = computed(() => CIRCUMFERENCE * (1 - (progress.value ?? 0)));
const holding = computed(() => progress.value !== null);
</script>

<template>
  <span class="relative inline-flex">
    <button
      v-bind="$attrs"
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
      @pointerup="release"
      @pointerleave="release"
      @pointercancel="release"
      @keydown="onKeyDown"
      @keyup="release"
      @blur="release"
      @contextmenu.prevent
    >
      <slot />
      <svg
        v-if="holding"
        class="pointer-events-none absolute inset-0 size-full -rotate-90"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" :r="RADIUS" fill="none" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
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
    <!-- A click, not a hold: explain instead of doing nothing -->
    <span
      v-if="showHint"
      role="status"
      class="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded border bg-card px-1.5 py-0.5 text-[10px] font-medium text-destructive shadow-md"
    >
      {{ hint }}
    </span>
  </span>
</template>
