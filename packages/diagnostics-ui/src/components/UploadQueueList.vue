<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import OpBadge from './ui/OpBadge.vue';

export interface CrudOp {
  id: number;
  op: string | null;
  tbl: string | null;
  row_id: string | null;
}

const props = defineProps<{ ops: CrudOp[] }>();

const parentRef = ref<HTMLElement | null>(null);
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: props.ops.length,
    getScrollElement: () => parentRef.value,
    estimateSize: () => 26,
    overscan: 12
  }))
);

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());
</script>

<template>
  <div ref="parentRef" class="max-h-64 overflow-auto">
    <div class="relative w-full" :style="{ height: totalSize + 'px' }">
      <div
        v-for="row in virtualRows"
        :key="row.index"
        class="absolute left-0 top-0 flex w-full items-center gap-2 border-b px-3 text-xs"
        :style="{ height: row.size + 'px', transform: `translateY(${row.start}px)` }"
      >
        <span class="w-12 shrink-0 truncate tabular-nums text-muted-foreground/50">#{{ ops[row.index].id }}</span>
        <OpBadge :op="ops[row.index].op" class="w-14 shrink-0" />
        <span class="shrink-0 font-mono">{{ ops[row.index].tbl ?? 'unknown' }}</span>
        <span class="min-w-0 flex-1 truncate font-mono text-muted-foreground" :title="ops[row.index].row_id ?? undefined">
          {{ ops[row.index].row_id ?? '' }}
        </span>
      </div>
    </div>
  </div>
</template>
