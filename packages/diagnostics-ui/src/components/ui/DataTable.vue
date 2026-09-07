<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';

const props = defineProps<{ columns: string[]; rows: Record<string, unknown>[] }>();

const DEFAULT_COL = 180;
const MIN_COL = 60;

// Per-column pixel widths (drag to resize). Reset when the column set changes.
const colWidths = ref<number[]>([]);
watch(
  () => props.columns,
  (cols) => (colWidths.value = cols.map(() => DEFAULT_COL)),
  { immediate: true }
);

const gridStyle = computed(() => ({ gridTemplateColumns: colWidths.value.map((w) => `${w}px`).join(' ') }));
const minWidth = computed(() => `${colWidths.value.reduce((a, b) => a + b, 0)}px`);

function startResize(index: number, e: MouseEvent) {
  const startX = e.clientX;
  const startW = colWidths.value[index] ?? DEFAULT_COL;
  function move(ev: MouseEvent) {
    const w = Math.max(MIN_COL, startW + (ev.clientX - startX));
    colWidths.value = colWidths.value.map((cw, i) => (i === index ? w : cw));
  }
  function up() {
    document.removeEventListener('mousemove', move);
    document.removeEventListener('mouseup', up);
    document.body.style.cursor = '';
  }
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
  document.body.style.cursor = 'col-resize';
}

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

function display(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
</script>

<template>
  <div ref="parentRef" class="overflow-auto">
    <!-- Header (resizable) -->
    <div class="sticky top-0 z-10 grid min-w-full border-b bg-card text-xs" :style="[gridStyle, { minWidth }]">
      <div v-for="(c, i) in columns" :key="c" class="relative truncate px-2 py-1.5 font-medium text-muted-foreground">
        {{ c }}
        <div
          class="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
          title="Drag to resize"
          @mousedown.prevent="startResize(i, $event)"
        />
      </div>
    </div>
    <!-- Virtualized rows -->
    <div class="relative min-w-full" :style="{ height: totalSize + 'px', minWidth }">
      <div
        v-for="row in virtualRows"
        :key="row.index"
        class="absolute left-0 top-0 grid w-full items-center border-b text-xs hover:bg-muted/30"
        :style="{ height: row.size + 'px', transform: `translateY(${row.start}px)`, ...gridStyle }"
      >
        <div v-for="c in columns" :key="c" class="truncate px-2 font-mono" :title="display(rows[row.index][c])">
          {{ display(rows[row.index][c]) }}
        </div>
      </div>
    </div>
  </div>
</template>
