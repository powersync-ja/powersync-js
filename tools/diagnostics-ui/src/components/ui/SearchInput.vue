<script setup lang="ts">
import IconSearch from '~icons/carbon/search';
import IconClose from '~icons/carbon/close';

const model = defineModel<string>({ required: true });
defineProps<{ placeholder?: string }>();
</script>

<template>
  <div class="relative">
    <IconSearch class="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    <input
      v-model="model"
      type="text"
      :placeholder="placeholder ?? 'Search…'"
      class="h-7 w-full rounded-md border bg-transparent pl-7 pr-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
    />
    <button
      v-if="model"
      type="button"
      class="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
      title="Clear"
      aria-label="Clear search"
      @click="model = ''"
    >
      <IconClose class="size-3.5" />
    </button>
  </div>
</template>
