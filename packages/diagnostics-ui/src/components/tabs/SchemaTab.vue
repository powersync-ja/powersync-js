<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SerializedSchema, SerializedTable } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import Card from '../ui/Card.vue';
import Badge from '../ui/Badge.vue';

const { client, connected } = useDiagnostics();
const schema = ref<SerializedSchema | null>(null);

async function load() {
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
