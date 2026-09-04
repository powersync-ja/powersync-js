<script setup lang="ts">
import { ref } from 'vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<{ tabs: { label: string; lang: string; code: string }[] }>();

const active = ref(0);
</script>

<template>
  <div class="overflow-hidden rounded-md border">
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
    <CodeBlock :code="props.tabs[active].code" :lang="props.tabs[active].lang" class="rounded-none border-0" />
  </div>
</template>
