<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import StatusBar from './StatusBar.vue';
import Logo from './ui/Logo.vue';
import EmptyState from './ui/EmptyState.vue';
import CodeTabs from './ui/CodeTabs.vue';
import { useTheme } from '../composables/theme';
import { useDiagnostics } from '../composables/diagnostics';
import { useSyncActions } from '../composables/actions';
import SyncStatusTab from './tabs/SyncStatusTab.vue';
import DataInspectorTab from './tabs/DataInspectorTab.vue';
import BucketsTab from './tabs/BucketsTab.vue';
import StreamsTab from './tabs/StreamsTab.vue';
import ConfigTab from './tabs/ConfigTab.vue';
import LogsTab from './tabs/LogsTab.vue';
import IconSun from '~icons/carbon/sun';
import IconMoon from '~icons/carbon/moon';
import IconConnecting from '~icons/carbon/circle-dash';
import IconOffline from '~icons/carbon/connection-signal-off';
import IconSync from '~icons/carbon/update-now';
import IconReset from '~icons/carbon/reset';

const { isDark, toggle } = useTheme();
const { connected, sources, activeSource, selectSource } = useDiagnostics();
const { syncing, clearing, syncNow, clearAndResync } = useSyncActions();

// Brief grace period so a normal handshake doesn't flash the "no client" screen.
const waiting = ref(true);
onMounted(() => setTimeout(() => (waiting.value = false), 1500));

// A host that fronts several databases reports which are attached; none means no app is serving one.
const noSource = computed(() => sources.value !== null && sources.value.length === 0);
const sourceChoices = computed(() => sources.value ?? []);

// Keep the chosen database across refreshes (per viewer), as long as it is still attached.
const SOURCE_KEY = 'powersync-diagnostics-source';
function onSelectSource(event: Event) {
  const sourceId = (event.target as HTMLSelectElement).value;
  try {
    localStorage.setItem(SOURCE_KEY, sourceId);
  } catch {
    // best-effort
  }
  void selectSource(sourceId);
}
watch(sources, (list) => {
  if (!list?.length) return;
  try {
    const stored = localStorage.getItem(SOURCE_KEY);
    if (stored && stored !== activeSource.value?.id && list.some((source) => source.id === stored))
      void selectSource(stored);
  } catch {
    // localStorage unavailable
  }
});

const setupTabs = [
  {
    label: 'JavaScript',
    lang: 'javascript',
    code: `// vite.config.ts — the plugin attaches diagnostics in dev only; nothing ships to production.
import powersyncDevtools from '@powersync/diagnostics/vite';

export default defineConfig({
  devtools: true,
  plugins: [powersyncDevtools()]
});

// Enable the core diagnostics stream for per-bucket progress.
db.connect(connector, { diagnostics: true });`
  },
  {
    label: 'Dart',
    lang: 'dart',
    code: `// Diagnostics are on in debug builds and off in release builds. Open the
// PowerSync tab in Flutter DevTools while the app runs.
final db = PowerSyncDatabase(schema: schema, path: path);

// Enable the core diagnostics stream for per-bucket progress.
await db.connect(connector: connector, diagnostics: true);`
  }
];

const tabs = [
  { value: 'status', label: 'Sync Status' },
  { value: 'data', label: 'Data Inspector' },
  { value: 'buckets', label: 'Buckets' },
  { value: 'streams', label: 'Streams' },
  { value: 'config', label: 'Config' },
  { value: 'logs', label: 'Logs' }
];

// Keep the selected tab across refreshes (per viewer).
const TAB_KEY = 'powersync-diagnostics-tab';
function initialTab(): string {
  try {
    const stored = localStorage.getItem(TAB_KEY);
    if (stored && tabs.some((t) => t.value === stored)) return stored;
  } catch {
    // localStorage unavailable
  }
  return 'status';
}
const activeTab = ref(initialTab());
watch(activeTab, (value) => {
  try {
    localStorage.setItem(TAB_KEY, value);
  } catch {
    // best-effort
  }
});
</script>

<template>
  <div :class="['flex h-full flex-col bg-background text-sm text-foreground', { dark: isDark }]">
    <!-- Header: brand + theme toggle -->
    <header class="flex items-center justify-between border-b px-3 py-1.5">
      <span class="inline-flex items-center gap-1.5">
        <Logo class="size-4 shrink-0" />
        <span class="font-semibold tracking-tight">PowerSync</span>
        <span class="text-xs text-muted-foreground">Diagnostics</span>
      </span>
      <div class="flex items-center gap-0.5">
        <!-- Several databases attached: pick the one to show -->
        <select
          v-if="sourceChoices.length > 1"
          class="mr-1 rounded border bg-background px-1.5 py-0.5 text-xs text-foreground"
          title="Attached database"
          aria-label="Attached database"
          :value="activeSource?.id"
          @change="onSelectSource"
        >
          <option v-for="source in sourceChoices" :key="source.id" :value="source.id">
            {{ source.id }}{{ source.sdk ? ` · ${source.sdk}` : '' }}
          </option>
        </select>
        <!-- Global sync actions, available from every tab -->
        <template v-if="connected">
          <button
            type="button"
            class="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Sync now (request a checkpoint and wait until caught up)"
            aria-label="Sync now"
            :disabled="syncing"
            @click="syncNow"
          >
            <IconSync :class="['size-4', syncing && 'animate-spin']" />
          </button>
          <button
            type="button"
            class="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:opacity-50"
            title="Clear &amp; re-sync (wipe local data and download again)"
            aria-label="Clear and re-sync"
            :disabled="clearing"
            @click="clearAndResync"
          >
            <IconReset :class="['size-4', clearing && 'animate-spin']" />
          </button>
          <span class="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
        </template>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          :title="isDark ? 'Switch to light' : 'Switch to dark'"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggle"
        >
          <IconSun v-if="isDark" class="size-4" />
          <IconMoon v-else class="size-4" />
        </button>
      </div>
    </header>

    <!-- Persistent, real-time status bar (visible on every tab) -->
    <StatusBar />

    <!-- No client attached: guide the developer to wire diagnostics up. -->
    <div v-if="!connected" class="min-h-0 flex-1 overflow-auto">
      <EmptyState
        v-if="waiting && !noSource"
        :icon="IconConnecting"
        spin
        title="Connecting to client…"
        description="Looking for a PowerSync client with the diagnostics agent attached."
      />
      <EmptyState
        v-else-if="noSource"
        :icon="IconOffline"
        tone="warning"
        title="No PowerSync database attached"
        description="DevTools is connected, but no app is serving a database. Open your app in a browser tab that DevTools trusts, or call enablePowerSyncDiagnostics() in a node app. The view fills in as soon as one attaches."
      />
      <EmptyState
        v-else
        :icon="IconOffline"
        tone="warning"
        title="No PowerSync client detected"
        description="The diagnostics agent isn't attached to a running client. Enable it in your app during development:"
      >
        <CodeTabs :tabs="setupTabs" />
      </EmptyState>
    </div>

    <TabsRoot v-else v-model="activeTab" class="flex min-h-0 flex-1 flex-col">
      <TabsList class="flex gap-0.5 border-b px-1.5">
        <TabsTrigger
          v-for="t in tabs"
          :key="t.value"
          :value="t.value"
          class="cursor-pointer border-b-2 border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
        >
          {{ t.label }}
        </TabsTrigger>
      </TabsList>

      <div class="min-h-0 flex-1 overflow-auto">
        <TabsContent value="status" class="p-3 focus-visible:outline-none"><SyncStatusTab /></TabsContent>
        <TabsContent value="data" class="h-full focus-visible:outline-none"><DataInspectorTab /></TabsContent>
        <TabsContent value="buckets" class="p-3 focus-visible:outline-none"><BucketsTab /></TabsContent>
        <TabsContent value="streams" class="p-3 focus-visible:outline-none"><StreamsTab /></TabsContent>
        <TabsContent value="config" class="p-3 focus-visible:outline-none"><ConfigTab /></TabsContent>
        <TabsContent value="logs" class="h-full focus-visible:outline-none"><LogsTab /></TabsContent>
      </div>
    </TabsRoot>
  </div>
</template>
