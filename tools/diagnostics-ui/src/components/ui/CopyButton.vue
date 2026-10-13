<script setup lang="ts">
import { ref } from 'vue';
import IconCopy from '~icons/carbon/copy';
import IconCheck from '~icons/carbon/checkmark';

const props = defineProps<{ value: string | null | undefined }>();

const copied = ref(false);
async function copy() {
  if (!props.value) return;
  try {
    await navigator.clipboard.writeText(props.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // clipboard may be unavailable
  }
}
</script>

<template>
  <button
    type="button"
    class="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
    :disabled="!value"
    title="Copy"
    aria-label="Copy"
    @click="copy"
  >
    <IconCheck v-if="copied" class="size-3 text-success" />
    <IconCopy v-else class="size-3" />
  </button>
</template>
