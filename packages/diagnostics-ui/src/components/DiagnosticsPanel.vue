<script setup lang="ts">
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import { useDiagnostics } from '../composables/diagnostics';
import Badge from './ui/Badge.vue';
import SyncStatusTab from './tabs/SyncStatusTab.vue';
import DataInspectorTab from './tabs/DataInspectorTab.vue';
import BucketsTab from './tabs/BucketsTab.vue';
import StreamsTab from './tabs/StreamsTab.vue';
import SchemaTab from './tabs/SchemaTab.vue';

const { connected, status } = useDiagnostics();

const tabs = [
  { value: 'status', label: 'Sync Status' },
  { value: 'data', label: 'Data Inspector' },
  { value: 'buckets', label: 'Buckets' },
  { value: 'streams', label: 'Streams' },
  { value: 'schema', label: 'Schema' }
];
</script>

<template>
  <div class="flex h-full flex-col bg-background text-sm text-foreground">
    <header class="flex items-center justify-between border-b px-4 py-2">
      <span class="font-semibold">PowerSync Diagnostics</span>
      <Badge v-if="connected" :variant="status?.connected ? 'success' : 'muted'">
        {{ status?.connected ? 'Connected' : status?.connecting ? 'Connecting' : 'Offline' }}
      </Badge>
      <Badge v-else variant="warning">No agent</Badge>
    </header>

    <TabsRoot default-value="status" class="flex min-h-0 flex-1 flex-col">
      <TabsList class="flex gap-1 border-b px-2">
        <TabsTrigger
          v-for="t in tabs"
          :key="t.value"
          :value="t.value"
          class="cursor-pointer border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
        >
          {{ t.label }}
        </TabsTrigger>
      </TabsList>

      <div class="min-h-0 flex-1 overflow-auto">
        <TabsContent value="status" class="p-4 focus-visible:outline-none"><SyncStatusTab /></TabsContent>
        <TabsContent value="data" class="h-full focus-visible:outline-none"><DataInspectorTab /></TabsContent>
        <TabsContent value="buckets" class="p-4 focus-visible:outline-none"><BucketsTab /></TabsContent>
        <TabsContent value="streams" class="p-4 focus-visible:outline-none"><StreamsTab /></TabsContent>
        <TabsContent value="schema" class="p-4 focus-visible:outline-none"><SchemaTab /></TabsContent>
      </div>
    </TabsRoot>
  </div>
</template>
