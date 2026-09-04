<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { StreamState } from '@powersync/diagnostics-core';
import { useDiagnostics } from '../../composables/diagnostics';
import { useFuzzySearch } from '../../composables/fuzzy';
import { formatCompact, formatParams, formatPrecise } from '../../lib/format';
import Badge from '../ui/Badge.vue';
import Button from '../ui/Button.vue';
import SearchInput from '../ui/SearchInput.vue';
import AutocompleteInput from '../ui/AutocompleteInput.vue';
import IconStream from '~icons/carbon/flow-stream';
import IconTime from '~icons/carbon/time';
import IconWarning from '~icons/carbon/warning-alt';
import IconAdd from '~icons/carbon/add';
import IconUnlink from '~icons/carbon/unlink';

const { client, streams } = useDiagnostics();
const { query, results } = useFuzzySearch(streams, ['name']);

// Ticking clock so TTL countdowns update live.
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => (timer = setInterval(() => (now.value = Date.now()), 1000)));
onUnmounted(() => timer && clearInterval(timer));

function ttl(expiresAt: number | null): string {
  if (expiresAt == null) return 'no expiry';
  const ms = expiresAt - now.value;
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function streamKey(s: StreamState): string {
  return (s.name ?? '') + JSON.stringify(s.params);
}

// Known stream names for the subscribe field's autocomplete.
const streamNames = computed(() => [...new Set(streams.value.map((s) => s.name).filter((n): n is string => !!n))]);

// --- subscribe form ---
const name = ref('');
const paramsText = ref('');
const ttlInput = ref(0);
const priorityInput = ref('');
const error = ref('');

async function subscribe() {
  error.value = '';
  let params: Record<string, unknown> | undefined;
  if (paramsText.value.trim()) {
    try {
      params = JSON.parse(paramsText.value);
    } catch {
      error.value = 'Params must be valid JSON';
      return;
    }
  }
  const priority = priorityInput.value === '' ? undefined : Number(priorityInput.value);
  try {
    await client.action({ action: 'subscribeStream', args: { name: name.value, params, ttl: ttlInput.value, priority } });
    name.value = '';
    paramsText.value = '';
    ttlInput.value = 0;
    priorityInput.value = '';
  } catch (e) {
    error.value = String((e as Error).message ?? e);
  }
}

async function unsubscribe(s: StreamState) {
  error.value = '';
  try {
    await client.action({ action: 'unsubscribeStream', args: { name: s.name, params: s.params } });
  } catch (e) {
    error.value = String((e as Error).message ?? e);
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs text-warning">
      <IconWarning class="mt-0.5 size-3.5 shrink-0" />
      <span>Subscriptions are shared across all tabs and affect the app's real sync. Debug subscriptions default to TTL 0 (evicted on unsubscribe).</span>
    </div>

    <SearchInput v-model="query" placeholder="Search streams…" />

    <div v-if="!results.length" class="rounded-lg border bg-card px-3 py-6 text-center text-xs text-muted-foreground">
      {{ streams.length ? 'No streams match your search.' : 'No stream subscriptions.' }}
    </div>

    <div v-else class="space-y-1.5">
      <div v-for="s in results" :key="streamKey(s)" class="rounded-lg border bg-card px-2.5 py-1.5">
        <!-- Top row: name · params · kind · active/inactive · TTL · unsubscribe -->
        <div class="flex items-center gap-2 text-xs">
          <IconStream class="size-3.5 shrink-0 text-muted-foreground" />
          <span class="max-w-[11rem] shrink-0 truncate font-mono font-medium" :title="s.name ?? undefined">{{ s.name }}</span>
          <span class="min-w-0 flex-1 truncate font-mono text-muted-foreground" :title="s.params ? formatParams(s.params) : undefined">{{ s.params ? formatParams(s.params) : '' }}</span>
          <span class="inline-flex shrink-0 items-center gap-1 tabular-nums text-muted-foreground"><IconTime class="size-3" />{{ ttl(s.expiresAt) }}</span>
          <Badge v-if="s.autoSubscribed" variant="muted" class="shrink-0">Auto Subscribed</Badge>
          <Badge v-if="s.explicitlySubscribed" variant="default" class="shrink-0">Invoked</Badge>
          <Badge :variant="s.active ? 'success' : 'muted'" class="shrink-0">{{ s.active ? 'active' : 'inactive' }}</Badge>
          <Button
            v-if="s.explicitlySubscribed"
            size="sm"
            variant="ghost"
            class="shrink-0"
            :disabled="!s.active"
            :title="s.active ? undefined : 'Inactive — nothing to unsubscribe'"
            @click="unsubscribe(s)"
          >
            <IconUnlink class="size-3.5" /> Unsubscribe
          </Button>
        </div>

        <!-- Second level: priority · synced · progress -->
        <div class="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span class="shrink-0 rounded bg-muted px-1.5 py-0.5 font-medium tabular-nums">P{{ s.priority ?? '—' }}</span>
          <span class="shrink-0">Synced <span class="tabular-nums text-foreground">{{ s.hasSynced ? formatPrecise(s.lastSyncedAt) : 'pending' }}</span></span>
          <div v-if="s.progress" class="flex min-w-0 flex-1 items-center gap-2">
            <div class="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full bg-primary" :style="{ width: s.progress.downloadedFraction * 100 + '%' }" />
            </div>
            <span class="shrink-0 tabular-nums">{{ formatCompact(s.progress.downloadedOperations) }}/{{ formatCompact(s.progress.totalOperations) }} · {{ Math.round(s.progress.downloadedFraction * 100) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Subscribe (debug) -->
    <section class="rounded-lg border bg-card">
      <header class="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs font-medium text-muted-foreground">
        <IconAdd class="size-3.5" /> Subscribe (debug)
      </header>
      <div class="space-y-2 p-3">
        <div class="flex flex-wrap items-center gap-2">
          <AutocompleteInput v-model="name" :options="streamNames" placeholder="stream name" class="w-40" />
          <input
            v-model="paramsText"
            placeholder='params JSON e.g. {"id":1}'
            class="h-7 min-w-40 flex-1 rounded-md border bg-transparent px-2 font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <label class="inline-flex items-center gap-1 text-xs text-muted-foreground">
            TTL
            <input
              v-model.number="ttlInput"
              type="number"
              min="0"
              class="h-7 w-16 rounded-md border bg-transparent px-2 text-xs tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
          <label class="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Priority
            <select
              v-model="priorityInput"
              class="h-7 rounded-md border bg-transparent px-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">default</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <Button size="sm" :disabled="!name" @click="subscribe"><IconAdd class="size-3.5" /> Subscribe</Button>
        </div>
        <div v-if="error" class="text-xs text-destructive">{{ error }}</div>
      </div>
    </section>
  </div>
</template>
