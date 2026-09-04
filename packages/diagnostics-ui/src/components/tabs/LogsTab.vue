<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import { useDiagnostics } from '../../composables/diagnostics';
import { useFuzzySearch } from '../../composables/fuzzy';
import { formatPrecise } from '../../lib/format';
import SearchInput from '../ui/SearchInput.vue';
import Button from '../ui/Button.vue';
import IconClear from '~icons/carbon/trash-can';

const { client, logs } = useDiagnostics();

const LEVELS = ['trace', 'debug', 'info', 'warn', 'error'] as const;
const enabled = ref(new Set<string>(LEVELS));
function toggle(level: string) {
  const next = new Set(enabled.value);
  next.has(level) ? next.delete(level) : next.add(level);
  enabled.value = next;
}

const levelColor: Record<string, string> = {
  error: 'text-destructive',
  warn: 'text-warning',
  info: 'text-blue-600 dark:text-blue-400',
  debug: 'text-muted-foreground',
  trace: 'text-muted-foreground/60'
};

const byLevel = computed(() => logs.value.filter((r) => enabled.value.has(r.level)));
const { query, results } = useFuzzySearch(byLevel, ['message']);

const parentRef = ref<HTMLElement | null>(null);
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: results.value.length,
    getScrollElement: () => parentRef.value,
    estimateSize: () => 22,
    overscan: 16
  }))
);
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());

function argsText(args: readonly unknown[] | undefined): string {
  return args?.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') ?? '';
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="flex flex-wrap items-center gap-2 border-b p-2">
      <div class="flex gap-1">
        <button
          v-for="l in LEVELS"
          :key="l"
          :class="[
            'rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase transition-colors',
            enabled.has(l) ? ['bg-accent', levelColor[l]] : 'border-transparent text-muted-foreground/40'
          ]"
          @click="toggle(l)"
        >
          {{ l }}
        </button>
      </div>
      <SearchInput v-model="query" placeholder="Search logs…" class="w-48" />
      <span class="tabular-nums text-xs text-muted-foreground">{{ results.length }}</span>
      <Button size="sm" variant="ghost" class="ml-auto" @click="client.clearLogs()"><IconClear class="size-3.5" /> Clear</Button>
    </div>

    <div ref="parentRef" class="min-h-0 flex-1 overflow-auto font-mono text-xs">
      <div v-if="!results.length" class="p-4 text-muted-foreground">
        {{ logs.length ? 'No logs match the filter.' : 'No logs yet.' }}
      </div>
      <div v-else class="relative w-full" :style="{ height: totalSize + 'px' }">
        <div
          v-for="row in virtualRows"
          :key="row.index"
          class="absolute left-0 top-0 flex w-full items-baseline gap-2 px-3 leading-[22px]"
          :style="{ height: row.size + 'px', transform: `translateY(${row.start}px)` }"
        >
          <span class="shrink-0 tabular-nums text-muted-foreground/50">{{ formatPrecise(results[row.index].timestamp) }}</span>
          <span :class="['w-10 shrink-0 font-semibold uppercase', levelColor[results[row.index].level]]">{{ results[row.index].level }}</span>
          <span class="truncate">
            {{ results[row.index].message }}<span v-if="results[row.index].args" class="text-muted-foreground"> {{ argsText(results[row.index].args) }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
