<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';

const props = defineProps<{ columns: string[]; rows: Record<string, unknown>[] }>();

const parentRef = ref<HTMLElement | null>(null);
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: props.rows.length,
    getScrollElement: () => parentRef.value,
    estimateSize: () => 28,
    overscan: 14
  }))
);
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

const gridStyle = computed(() => ({ gridTemplateColumns: `repeat(${props.columns.length}, minmax(0, 1fr))` }));

function display(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
</script>

<template>
  <div ref="parentRef" class="overflow-auto">
    <!-- Header -->
    <div class="sticky top-0 z-10 grid border-b bg-card text-xs" :style="gridStyle">
      <div v-for="c in columns" :key="c" class="truncate px-2 py-1.5 font-medium text-muted-foreground">{{ c }}</div>
    </div>
    <!-- Virtualized rows -->
    <div class="relative w-full" :style="{ height: totalSize + 'px' }">
      <div
        v-for="row in virtualRows"
        :key="row.index"
        class="absolute left-0 top-0 grid w-full items-center border-b text-xs hover:bg-muted/30"
        :style="{ height: row.size + 'px', transform: `translateY(${row.start}px)`, ...gridStyle }"
      >
        <div
          v-for="c in columns"
          :key="c"
          class="truncate px-2 font-mono"
          :title="display(rows[row.index][c])"
        >
          {{ display(rows[row.index][c]) }}
        </div>
      </div>
    </div>
  </div>
</template>
