<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import type { CommonPowerSyncDatabase } from '@powersync/common';
import { DiagnosticsAgent } from '@powersync/common/diagnostics';
import { DiagnosticsClient } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics, useTheme } from '../src';
import { BroadcastEventSource } from './broadcastEventSource';
import { createLoopback } from './loopback';
import { createMockDatabase } from './mockDatabase';

// The panel owns the theme (toggle lives in its header); the harness follows the same shared state.
const { isDark } = useTheme();

const [agentTransport, clientTransport] = createLoopback();
const db = createMockDatabase();
const agent = new DiagnosticsAgent(db as unknown as CommonPowerSyncDatabase, agentTransport, {
  sdk: '@powersync/web (mock)',
  eventSource: new BroadcastEventSource()
});
const client = new DiagnosticsClient(clientTransport);

provideDiagnostics(client);

onMounted(() => {
  agent.start();
  client.start();
  db.simulate();
});

onUnmounted(() => {
  client.stop();
  agent.stop();
});
</script>

<template>
  <div :class="[isDark ? 'dark' : '', 'h-screen w-screen bg-background']">
    <div class="flex h-full flex-col">
      <div class="border-b bg-card px-4 py-1 text-[11px] text-muted-foreground">
        diagnostics-ui playground · loopback transport · mock client
      </div>
      <div class="min-h-0 flex-1">
        <DiagnosticsPanel />
      </div>
    </div>
  </div>
</template>
