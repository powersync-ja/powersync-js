<script setup lang="ts">
import { ref, watch } from 'vue';
import type { BucketState } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../composables/diagnostics';
import { formatBytes, formatCompact } from '../lib/format';
import Button from './ui/Button.vue';
import DataTable from './ui/DataTable.vue';
import IconBack from '~icons/carbon/arrow-left';
import IconRefresh from '~icons/carbon/renew';
import IconBuckets from '~icons/carbon/data-base';

const props = defineProps<{ bucket: BucketState }>();
defineEmits<{ back: [] }>();

const { client } = useDiagnostics();
const columns = ref<string[]>([]);
const rows = ref<Record<string, unknown>[]>([]);
const error = ref<string | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await client.query(
      'SELECT op_id, row_type, row_id, data FROM ps_oplog WHERE bucket = (SELECT id FROM ps_buckets WHERE name = ?) ORDER BY op_id DESC LIMIT 1000',
      [props.bucket.name]
    );
    columns.value = res.columns;
    rows.value = res.rows;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    columns.value = [];
    rows.value = [];
  } finally {
    loading.value = false;
  }
}
watch(() => props.bucket.name, load, { immediate: true });
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <Button size="sm" variant="ghost" @click="$emit('back')"><IconBack class="size-3.5" /> Buckets</Button>
      <IconBuckets class="size-3.5 text-muted-foreground" />
      <span class="min-w-0 flex-1 truncate font-mono text-sm" :title="bucket.name">{{ bucket.name }}</span>
      <Button size="sm" variant="outline" :disabled="loading" @click="load">
        <IconRefresh :class="['size-3.5', loading && 'animate-spin']" /> Refresh
      </Button>
    </div>

    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>Operations <span class="tabular-nums text-foreground">{{ formatCompact(bucket.downloadedOperations) }}<template v-if="bucket.totalOperations != null"> / {{ formatCompact(bucket.totalOperations) }}</template></span></span>
      <span>Size <span class="tabular-nums text-foreground">{{ formatBytes(bucket.downloadedSize) }}</span></span>
      <span>Last op <span class="font-mono text-foreground">{{ bucket.lastOp ?? '—' }}</span></span>
      <span>Rows loaded <span class="tabular-nums text-foreground">{{ formatCompact(rows.length) }}</span></span>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive"
    >
      {{ error }}
    </div>
    <div v-else-if="!rows.length" class="rounded-lg border bg-card px-3 py-6 text-center text-xs text-muted-foreground">
      {{ loading ? 'Loading…' : 'No rows in this bucket.' }}
    </div>
    <DataTable v-else :columns="columns" :rows="rows" class="max-h-[55vh] rounded-lg border" />
  </div>
</template>
