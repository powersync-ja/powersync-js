<script setup lang="ts">
import { computed, ref } from 'vue';
import CodeBlock from './CodeBlock.vue';

/** One tab per variant: a code snippet, or a short note where there is nothing to paste. */
export interface CodeTab {
  label: string;
  lang?: string;
  code?: string;
  note?: string;
}

const props = defineProps<{ tabs: CodeTab[] }>();

const active = ref(0);
const current = computed(() => props.tabs[active.value]);
</script>

<template>
  <div class="overflow-hidden rounded-md border text-left">
    <div class="flex gap-0.5 border-b bg-muted/40 px-1 pt-1">
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
    <CodeBlock v-if="current.code" :code="current.code" :lang="current.lang ?? 'text'" class="rounded-none border-0" />
    <p v-else-if="current.note" class="px-3 py-3 text-xs leading-relaxed text-muted-foreground">
      {{ current.note }}
    </p>
  </div>
</template>
