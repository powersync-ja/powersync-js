<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import CodeBlock from './CodeBlock.vue';

/** One tab per variant: a code snippet, or a short note where there is nothing to paste. */
export interface CodeTab {
  label: string;
  lang?: string;
  code?: string;
  note?: string;
  /** A guide for this variant, linked below the snippet. */
  link?: { href: string; label: string };
}

const props = defineProps<{ tabs: CodeTab[] }>();

const active = ref(0);
// The host can narrow the tabs after mount; stay on a tab that still exists.
watch(
  () => props.tabs.length,
  (count) => {
    if (active.value >= count) active.value = 0;
  }
);
const current = computed(() => props.tabs[active.value]);
</script>

<template>
  <div v-if="current" class="text-left">
    <div class="overflow-hidden rounded-md border">
      <div v-if="props.tabs.length > 1" class="flex gap-0.5 border-b bg-muted/40 px-1 pt-1">
        <button
          v-for="(tab, i) in props.tabs"
          :key="tab.label"
          type="button"
          :class="[
            'rounded-t px-2.5 py-1 text-xs font-medium transition-colors',
            i === active ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
          ]"
          @click="active = i"
        >
          {{ tab.label }}
        </button>
      </div>
      <CodeBlock
        v-if="current.code"
        :code="current.code"
        :lang="current.lang ?? 'text'"
        class="rounded-none border-0"
      />
      <p v-else-if="current.note" class="px-3 py-3 text-xs leading-relaxed text-muted-foreground">
        {{ current.note }}
      </p>
    </div>
    <a
      v-if="current.link"
      :href="current.link.href"
      target="_blank"
      rel="noreferrer"
      class="mt-3 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
    >
      {{ current.link.label }} ↗
    </a>
  </div>
</template>
