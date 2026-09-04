<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import StatusBar from './StatusBar.vue';
import Logo from './ui/Logo.vue';
import { useTheme } from '../composables/theme';
import SyncStatusTab from './tabs/SyncStatusTab.vue';
import DataInspectorTab from './tabs/DataInspectorTab.vue';
import BucketsTab from './tabs/BucketsTab.vue';
import StreamsTab from './tabs/StreamsTab.vue';
import ConfigTab from './tabs/ConfigTab.vue';
import IconSun from '~icons/carbon/sun';
import IconMoon from '~icons/carbon/moon';

const { isDark, toggle } = useTheme();

const tabs = [
  { value: 'status', label: 'Sync Status' },
  { value: 'data', label: 'Data Inspector' },
  { value: 'buckets', label: 'Buckets' },
  { value: 'streams', label: 'Streams' },
  { value: 'config', label: 'Config' }
];
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
    </header>

    <!-- Persistent, real-time status bar (visible on every tab) -->
    <StatusBar />

    <TabsRoot default-value="status" class="flex min-h-0 flex-1 flex-col">
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
      </div>
    </TabsRoot>
  </div>
</template>
