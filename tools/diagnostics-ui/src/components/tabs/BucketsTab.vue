<script setup lang="ts">
import { computed, ref } from 'vue';
import type { BucketState } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import { useFuzzySearch } from '../../composables/fuzzy';
import { formatBytes, formatCompact } from '../../lib/format';
import BucketDetail from '../BucketDetail.vue';
import SearchInput from '../ui/SearchInput.vue';
import IconBuckets from '~icons/carbon/data-base';
import IconOps from '~icons/carbon/data-table';
import IconSize from '~icons/carbon/data-volume';
import IconSort from '~icons/carbon/chevron-sort';
import IconSortUp from '~icons/carbon/chevron-up';
import IconSortDown from '~icons/carbon/chevron-down';

const { buckets } = useDiagnostics();
const { query, results } = useFuzzySearch(buckets, ['name']);

const selected = ref<BucketState | null>(null);

type SortKey = 'name' | 'downloadedOperations' | 'downloadedSize' | 'lastOp';
const sortKey = ref<SortKey>('downloadedOperations');
const sortDir = ref<'asc' | 'desc'>('desc');

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'name' ? 'asc' : 'desc';
  }
}

const sorted = computed<BucketState[]>(() => {
  const numeric = sortKey.value === 'downloadedOperations' || sortKey.value === 'downloadedSize';
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...results.value].sort((a, b) => {
    const av = numeric ? (a[sortKey.value] as number) ?? 0 : String(a[sortKey.value] ?? '');
    const bv = numeric ? (b[sortKey.value] as number) ?? 0 : String(b[sortKey.value] ?? '');
    return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
  });
});

const totalBuckets = computed(() => buckets.value.length);
const totalOps = computed(() => buckets.value.reduce((s, b) => s + (b.downloadedOperations || 0), 0));
const totalTarget = computed(() => buckets.value.reduce((s, b) => s + (b.totalOperations || 0), 0));
const totalSize = computed(() => buckets.value.reduce((s, b) => s + (b.downloadedSize || 0), 0));

function fraction(b: BucketState): number {
  if (b.totalOperations == null || b.totalOperations === 0) return b.downloadedOperations > 0 ? 1 : 0;
  return Math.min(b.downloadedOperations / b.totalOperations, 1);
}

const columns: { key: SortKey; label: string; align: string }[] = [
  { key: 'name', label: 'Bucket', align: 'text-left' },
  { key: 'downloadedOperations', label: 'Operations', align: 'text-right' },
  { key: 'downloadedSize', label: 'Size', align: 'text-right' },
  { key: 'lastOp', label: 'Last op', align: 'text-left' }
];
</script>

<template>
  <BucketDetail v-if="selected" :bucket="selected" @back="selected = null" />

  <div v-else class="space-y-3">
    <!-- Aggregate totals -->
    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-lg border bg-card px-3 py-2">
        <div class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><IconBuckets class="size-3" /> Buckets</div>
        <div class="text-base font-semibold tabular-nums">{{ formatCompact(totalBuckets) }}</div>
      </div>
      <div class="rounded-lg border bg-card px-3 py-2">
        <div class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><IconOps class="size-3" /> Operations</div>
        <div class="text-base font-semibold tabular-nums">
          {{ formatCompact(totalOps) }}<span v-if="totalTarget > 0" class="text-xs font-normal text-muted-foreground"> / {{ formatCompact(totalTarget) }}</span>
        </div>
      </div>
      <div class="rounded-lg border bg-card px-3 py-2">
        <div class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"><IconSize class="size-3" /> Size</div>
        <div class="text-base font-semibold tabular-nums">{{ formatBytes(totalSize) }}</div>
      </div>
    </div>

    <SearchInput v-model="query" placeholder="Search buckets…" />

    <div v-if="!sorted.length" class="rounded-lg border bg-card px-3 py-6 text-center text-xs text-muted-foreground">
      {{ buckets.length ? 'No buckets match your search.' : 'No buckets.' }}
    </div>
    <div v-else class="overflow-x-auto rounded-lg border">
      <table class="w-full text-xs">
        <thead class="bg-muted/40 text-muted-foreground">
          <tr>
            <th v-for="col in columns" :key="col.key" :class="['px-3 py-1.5 font-medium', col.align]">
              <button class="inline-flex items-center gap-1 hover:text-foreground" @click="toggleSort(col.key)">
                {{ col.label }}
                <component
                  :is="sortKey === col.key ? (sortDir === 'asc' ? IconSortUp : IconSortDown) : IconSort"
                  :class="['size-3', sortKey === col.key ? 'text-foreground' : 'text-muted-foreground/40']"
                />
              </button>
            </th>
            <th class="px-3 py-1.5 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="b in sorted"
            :key="b.name"
            class="cursor-pointer border-t hover:bg-muted/40"
            title="Explore this bucket's data"
            @click="selected = b"
          >
            <td class="max-w-0 px-3 py-1.5">
              <div class="truncate font-mono text-primary">{{ b.name }}</div>
            </td>
            <td class="px-3 py-1.5 text-right">
              <div class="tabular-nums">
                {{ formatCompact(b.downloadedOperations) }}<span v-if="b.totalOperations != null" class="text-muted-foreground"> / {{ formatCompact(b.totalOperations) }}</span>
              </div>
              <div v-if="b.totalOperations != null" class="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div class="h-full rounded-full bg-primary" :style="{ width: fraction(b) * 100 + '%' }" />
              </div>
            </td>
            <td class="px-3 py-1.5 text-right tabular-nums">{{ formatBytes(b.downloadedSize) }}</td>
            <td class="px-3 py-1.5 font-mono text-muted-foreground">{{ b.lastOp ?? '—' }}</td>
            <td class="px-3 py-1.5">
              <span
                :class="[
                  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                  b.downloading ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                ]"
              >
                {{ b.downloading ? 'downloading' : 'idle' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
