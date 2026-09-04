<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PortInfo, SerializedSchema, SerializedTable } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import { formatParams } from '../../lib/format';
import Card from '../ui/Card.vue';
import Badge from '../ui/Badge.vue';

const { client, connected } = useDiagnostics();
const info = ref<PortInfo | null>(null);
const schema = ref<SerializedSchema | null>(null);

async function load() {
  try {
    info.value = await client.getInfo();
  } catch {
    // ignore
  }
  try {
    schema.value = await client.getSchema();
  } catch {
    // ignore
  }
}
watch(connected, (isConnected) => isConnected && load(), { immediate: true });

function tableFlags(table: SerializedTable): string[] {
  const flags: string[] = [];
  if (table.localOnly) flags.push('local-only');
  if (table.insertOnly) flags.push('insert-only');
  if (table.trackMetadata) flags.push('metadata');
  if (table.trackPrevious) flags.push('track-previous');
  if (table.ignoreEmptyUpdates) flags.push('ignore-empty-updates');
  return flags;
}

function indexColumns(columns: { name: string; ascending: boolean }[]): string {
  return columns.map((c) => c.name + (c.ascending ? '' : ' ↓')).join(', ');
}
</script>

<template>
  <div class="space-y-4">
    <Card>
      <div class="p-3 text-sm">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium text-muted-foreground">Connection</span>
          <button class="text-xs text-muted-foreground hover:text-foreground" @click="load">Refresh</button>
        </div>
        <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <span class="text-muted-foreground">Endpoint</span><span class="truncate font-mono">{{ info?.endpoint ?? '—' }}</span>
          <span class="text-muted-foreground">User ID</span><span class="truncate font-mono">{{ info?.userId ?? '—' }}</span>
          <span class="text-muted-foreground">Client ID</span><span class="truncate font-mono">{{ info?.clientId ?? '—' }}</span>
          <span class="text-muted-foreground">Method</span><span class="font-mono">{{ info?.connectionMethod ?? '—' }}</span>
          <span class="text-muted-foreground">Params</span><span class="font-mono">{{ formatParams(info?.params) }}</span>
          <span class="text-muted-foreground">SDK</span><span class="font-mono">{{ info?.sdk ?? '—' }}</span>
          <span class="text-muted-foreground">Core version</span><span class="font-mono">{{ info?.sqliteCoreVersion ?? '—' }}</span>
        </div>
      </div>
    </Card>

    <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Schema</div>
    <div v-if="!schema" class="text-muted-foreground">Loading schema…</div>
    <div v-else-if="!schema.tables.length" class="text-muted-foreground">No tables.</div>
    <Card v-for="table in schema?.tables ?? []" :key="table.name">
      <div class="p-3">
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="font-mono font-semibold">{{ table.name }}</span>
          <span v-if="table.viewNameOverride" class="text-xs text-muted-foreground">view: {{ table.viewName }}</span>
          <Badge v-for="flag in tableFlags(table)" :key="flag" variant="muted">{{ flag }}</Badge>
        </div>

        <table class="w-full text-sm">
          <thead class="text-left text-xs text-muted-foreground">
            <tr>
              <th class="py-1 pr-4 font-medium">Column</th>
              <th class="py-1 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="col in table.columns" :key="col.name" class="border-t">
              <td class="py-1 pr-4 font-mono">{{ col.name }}</td>
              <td class="py-1 font-mono text-xs text-muted-foreground">{{ col.type }}</td>
            </tr>
          </tbody>
        </table>

        <div v-if="table.indexes.length" class="mt-3">
          <div class="mb-1 text-xs font-medium text-muted-foreground">Indexes</div>
          <div v-for="idx in table.indexes" :key="idx.name" class="text-xs">
            <span class="font-mono">{{ idx.name }}</span>
            <span class="text-muted-foreground"> ({{ indexColumns(idx.columns) }})</span>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>
