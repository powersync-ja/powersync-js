<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { QueryResult } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import { useFuzzySearch } from '../../composables/fuzzy';
import Button from '../ui/Button.vue';
import SearchInput from '../ui/SearchInput.vue';
import SqlEditor from '../ui/SqlEditor.vue';
import DataTable from '../ui/DataTable.vue';
import IconView from '~icons/carbon/data-view';
import IconTable from '~icons/carbon/table';
import IconRun from '~icons/carbon/play-filled-alt';

interface DbObject {
  name: string;
  type: string;
}

const { client } = useDiagnostics();

const sql = ref('SELECT * FROM ps_buckets LIMIT 100;');
const result = ref<QueryResult | null>(null);
const error = ref('');
const running = ref(false);
const objects = ref<DbObject[]>([]);

const { query, results: filtered } = useFuzzySearch(objects, ['name']);
const views = computed(() => filtered.value.filter((o) => o.type === 'view'));
const tables = computed(() => filtered.value.filter((o) => o.type === 'table'));

async function loadObjects() {
  try {
    const res = await client.query(
      "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY type DESC, name"
    );
    objects.value = res.rows as unknown as DbObject[];
  } catch {
    objects.value = [];
  }
}

async function run() {
  running.value = true;
  error.value = '';
  try {
    result.value = await client.query(sql.value);
  } catch (e) {
    error.value = String((e as Error).message ?? e);
    result.value = null;
  } finally {
    running.value = false;
  }
}

function selectObject(name: string) {
  sql.value = `SELECT * FROM "${name}" LIMIT 100;`;
  run();
}

onMounted(() => {
  loadObjects();
  run();
});
</script>

<template>
  <div class="flex h-full min-h-0">
    <!-- Object tree: views + tables -->
    <aside class="flex w-52 shrink-0 flex-col border-r">
      <div class="p-2"><SearchInput v-model="query" placeholder="Search tables & views…" /></div>
      <div class="min-h-0 flex-1 overflow-auto px-1 pb-2 text-xs">
        <template v-if="views.length">
          <div class="px-1 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Views ({{ views.length }})</div>
          <button
            v-for="o in views"
            :key="o.name"
            class="flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left hover:bg-accent"
            @click="selectObject(o.name)"
          >
            <IconView class="size-3.5 shrink-0 text-muted-foreground" />
            <span class="truncate font-mono">{{ o.name }}</span>
          </button>
        </template>
        <template v-if="tables.length">
          <div class="mt-1 px-1 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Tables ({{ tables.length }})</div>
          <button
            v-for="o in tables"
            :key="o.name"
            class="flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left hover:bg-accent"
            @click="selectObject(o.name)"
          >
            <IconTable class="size-3.5 shrink-0 text-muted-foreground" />
            <span class="truncate font-mono">{{ o.name }}</span>
          </button>
        </template>
        <div v-if="!filtered.length" class="px-2 py-3 text-center text-muted-foreground">No objects.</div>
      </div>
    </aside>

    <!-- Editor + results -->
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="space-y-2 border-b p-2">
        <SqlEditor v-model="sql" placeholder="Enter SQL — ⌘/Ctrl+Enter to run" @run="run" />
        <div class="flex items-center gap-3 text-xs">
          <Button size="sm" :disabled="running" @click="run"><IconRun class="size-3.5" /> {{ running ? 'Running…' : 'Run' }}</Button>
          <span class="text-muted-foreground">⌘/Ctrl+Enter</span>
          <span v-if="result && !error" class="tabular-nums text-muted-foreground">{{ result.rowCount }} rows</span>
          <span v-if="error" class="truncate text-destructive" :title="error">{{ error }}</span>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-hidden">
        <DataTable v-if="result && result.rows.length" :columns="result.columns" :rows="result.rows" class="h-full" />
        <div v-else-if="result" class="p-4 text-xs text-muted-foreground">Query returned no rows.</div>
        <div v-else class="p-4 text-xs text-muted-foreground">Run a query to see results.</div>
      </div>
    </div>
  </div>
</template>
