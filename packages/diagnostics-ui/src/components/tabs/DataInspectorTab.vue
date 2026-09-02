<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { QueryResult, SerializedSchema } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import Button from '../ui/Button.vue';

const { client } = useDiagnostics();

const sql = ref('SELECT * FROM ps_buckets;');
const result = ref<QueryResult | null>(null);
const error = ref('');
const running = ref(false);
const schema = ref<SerializedSchema | null>(null);

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

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    run();
  }
}

function selectTable(tableName: string) {
  sql.value = `SELECT * FROM "${tableName}" LIMIT 100;`;
  run();
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

onMounted(async () => {
  try {
    schema.value = await client.getSchema();
  } catch {
    // ignore
  }
});
</script>

<template>
  <div class="flex h-full min-h-0">
    <aside class="w-48 shrink-0 overflow-auto border-r p-2">
      <div class="mb-1 px-1 text-xs font-medium text-muted-foreground">Tables</div>
      <button
        v-for="t in schema?.tables ?? []"
        :key="t.name"
        class="block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-accent"
        @click="selectTable(t.viewName)"
      >
        {{ t.viewName }}
      </button>
    </aside>

    <div class="flex min-h-0 flex-1 flex-col">
      <div class="border-b p-2">
        <textarea
          v-model="sql"
          rows="3"
          spellcheck="false"
          class="w-full resize-y rounded-md border bg-background p-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @keydown="onKeydown"
        ></textarea>
        <div class="mt-1 flex items-center gap-3">
          <Button size="sm" :disabled="running" @click="run">{{ running ? 'Running…' : 'Run (⌘/Ctrl+Enter)' }}</Button>
          <span v-if="result" class="text-xs text-muted-foreground">{{ result.rowCount }} rows</span>
          <span v-if="error" class="text-xs text-destructive">{{ error }}</span>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <table v-if="result" class="w-full text-sm">
          <thead class="sticky top-0 bg-muted/80 text-left text-xs text-muted-foreground backdrop-blur">
            <tr>
              <th v-for="c in result.columns" :key="c" class="px-3 py-2 font-medium">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in result.rows" :key="i" class="border-t">
              <td v-for="c in result.columns" :key="c" class="max-w-xs truncate px-3 py-1.5 font-mono text-xs">
                {{ formatCell(row[c]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
