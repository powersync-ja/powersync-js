<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ProtocolInfo, SchemaPayload, SchemaTable } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import { useFuzzySearch } from '../../composables/fuzzy';
import { formatParams } from '../../lib/format';
import Badge from '../ui/Badge.vue';
import Button from '../ui/Button.vue';
import InfoRow from '../ui/InfoRow.vue';
import CodeBlock from '../ui/CodeBlock.vue';
import SearchInput from '../ui/SearchInput.vue';
import IconLink from '~icons/carbon/link';
import IconUser from '~icons/carbon/user';
import IconId from '~icons/carbon/identification';
import IconConnect from '~icons/carbon/connect';
import IconParams from '~icons/carbon/parameter';
import IconCode from '~icons/carbon/code';
import IconChip from '~icons/carbon/chip';
import IconChevron from '~icons/carbon/chevron-right';
import IconTable from '~icons/carbon/table';
import IconRefresh from '~icons/carbon/renew';

const { client, connected } = useDiagnostics();
const info = ref<ProtocolInfo | null>(null);
const schema = ref<SchemaPayload | null>(null);

const connView = ref<'structured' | 'json'>('structured');
const schemaView = ref<'tree' | 'json'>('json');
const expanded = ref(new Set<string>());

async function load() {
  try {
    info.value = await client.getInfo();
  } catch {
    /* ignore */
  }
  try {
    schema.value = await client.getSchema();
  } catch {
    /* ignore */
  }
}
watch(connected, (isConnected) => isConnected && load(), { immediate: true });

const tables = computed(() => schema.value?.tables ?? []);
const { query, results: filteredTables } = useFuzzySearch(tables, ['name', 'columns.name']);

const infoJson = computed(() => JSON.stringify(info.value ?? {}, null, 2));
const schemaJson = computed(() => JSON.stringify(schema.value ?? {}, null, 2));

function toggle(name: string) {
  const next = new Set(expanded.value);
  next.has(name) ? next.delete(name) : next.add(name);
  expanded.value = next;
}
// Auto-expand while searching so matches are visible.
function isOpen(name: string): boolean {
  return query.value.trim() ? true : expanded.value.has(name);
}

// Flags come straight from the core schema payload (snake_case), the shape every SDK already produces.
function tableFlags(table: SchemaTable): string[] {
  const flags: string[] = [];
  if (table.local_only) flags.push('local-only');
  if (table.insert_only) flags.push('insert-only');
  if (table.include_metadata) flags.push('metadata');
  if (table.include_old) flags.push('track-previous');
  if (table.ignore_empty_update) flags.push('ignore-empty-updates');
  return flags;
}
// The core carries only the effective view name; it was overridden when it differs from the table name.
function hasViewOverride(table: SchemaTable): boolean {
  return table.view_name !== table.name;
}
function indexColumns(columns: { name: string; ascending: boolean }[]): string {
  return columns.map((c) => c.name + (c.ascending ? '' : ' ↓')).join(', ');
}
</script>

<template>
  <div class="space-y-3">
    <!-- Connection -->
    <section class="rounded-lg border bg-card">
      <header class="flex items-center justify-between border-b px-3 py-1.5">
        <span class="text-xs font-medium text-muted-foreground">Connection</span>
        <div class="flex items-center gap-2">
          <div class="inline-flex rounded-md border p-0.5 text-[11px]">
            <button :class="['rounded px-1.5 py-0.5', connView === 'structured' ? 'bg-accent text-foreground' : 'text-muted-foreground']" @click="connView = 'structured'">Fields</button>
            <button :class="['rounded px-1.5 py-0.5', connView === 'json' ? 'bg-accent text-foreground' : 'text-muted-foreground']" @click="connView = 'json'">JSON</button>
          </div>
          <button class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" title="Refresh" @click="load"><IconRefresh class="size-3.5" /></button>
        </div>
      </header>
      <div v-if="connView === 'structured'" class="divide-y">
        <InfoRow :icon="IconLink" label="Endpoint" :value="info?.endpoint" mono copyable />
        <InfoRow :icon="IconUser" label="User ID" :value="info?.userId" mono copyable />
        <InfoRow :icon="IconId" label="Client ID" :value="info?.clientId" mono copyable />
        <InfoRow :icon="IconConnect" label="Method" :value="info?.connectionMethod" />
        <InfoRow :icon="IconParams" label="Params" :value="formatParams(info?.params)" mono />
        <InfoRow :icon="IconCode" label="SDK" :value="info?.sdk" mono />
        <InfoRow :icon="IconChip" label="Core version" :value="info?.sqliteCoreVersion" mono />
      </div>
      <div v-else class="p-2"><CodeBlock :code="infoJson" lang="json" /></div>
    </section>

    <!-- Schema -->
    <section class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Schema</span>
        <div class="inline-flex rounded-md border p-0.5 text-[11px]">
          <button :class="['rounded px-1.5 py-0.5', schemaView === 'tree' ? 'bg-accent text-foreground' : 'text-muted-foreground']" @click="schemaView = 'tree'">Tree</button>
          <button :class="['rounded px-1.5 py-0.5', schemaView === 'json' ? 'bg-accent text-foreground' : 'text-muted-foreground']" @click="schemaView = 'json'">JSON</button>
        </div>
      </div>

      <div v-if="!schema" class="text-xs text-muted-foreground">Loading schema…</div>

      <template v-else-if="schemaView === 'tree'">
        <SearchInput v-model="query" placeholder="Search tables & columns…" />
        <div v-if="!filteredTables.length" class="rounded-lg border bg-card px-3 py-6 text-center text-xs text-muted-foreground">
          {{ tables.length ? 'No tables match your search.' : 'No tables.' }}
        </div>
        <div v-else class="space-y-1.5">
          <div v-for="table in filteredTables" :key="table.name" class="overflow-hidden rounded-lg border bg-card">
            <button class="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-muted/30" @click="toggle(table.name)">
              <IconChevron :class="['size-3.5 shrink-0 text-muted-foreground transition-transform', isOpen(table.name) && 'rotate-90']" />
              <IconTable class="size-3.5 shrink-0 text-muted-foreground" />
              <span class="font-mono font-medium">{{ table.name }}</span>
              <span class="text-muted-foreground">{{ table.columns.length }} cols</span>
              <span v-if="hasViewOverride(table)" class="text-muted-foreground">· view: {{ table.view_name }}</span>
              <span class="flex flex-1 flex-wrap justify-end gap-1">
                <Badge v-for="flag in tableFlags(table)" :key="flag" variant="muted">{{ flag }}</Badge>
              </span>
            </button>
            <div v-if="isOpen(table.name)" class="space-y-2 border-t px-3 py-2 text-xs">
              <div class="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
                <div v-for="col in table.columns" :key="col.name" class="flex items-center justify-between gap-2">
                  <span class="truncate font-mono">{{ col.name }}</span>
                  <span class="shrink-0 font-mono text-muted-foreground">{{ col.type }}</span>
                </div>
              </div>
              <div v-if="table.indexes.length" class="space-y-0.5 border-t pt-2">
                <div class="text-[11px] font-medium text-muted-foreground">Indexes</div>
                <div v-for="idx in table.indexes" :key="idx.name" class="font-mono">
                  {{ idx.name }} <span class="text-muted-foreground">({{ indexColumns(idx.columns) }})</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="schema.raw_tables.length" class="px-1 text-[11px] text-muted-foreground">
            Raw tables: <span class="font-mono">{{ schema.raw_tables.map((t) => t.name).join(', ') }}</span>
          </div>
        </div>
      </template>

      <div v-else><CodeBlock :code="schemaJson" lang="json" /></div>
    </section>
  </div>
</template>
