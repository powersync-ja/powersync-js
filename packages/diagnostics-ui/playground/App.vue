<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { CommonPowerSyncDatabase } from '@powersync/common';
import { DiagnosticsAgent, DiagnosticsClient } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics } from '../src';
import { createLoopback } from './loopback';
import { createMockDatabase } from './mockDatabase';

const dark = ref(true);

const [agentTransport, clientTransport] = createLoopback();
const db = createMockDatabase();
const agent = new DiagnosticsAgent(db as unknown as CommonPowerSyncDatabase, agentTransport, {
  sdk: '@powersync/web (mock)'
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
  <div :class="[dark ? 'dark' : '', 'h-screen w-screen bg-background']">
    <div class="flex h-full flex-col">
      <div class="flex items-center justify-between border-b bg-card px-4 py-1.5 text-xs text-muted-foreground">
        <span>diagnostics-ui playground · loopback transport · mock client</span>
        <button class="rounded border px-2 py-0.5 hover:bg-accent" @click="dark = !dark">
          {{ dark ? 'Light' : 'Dark' }}
        </button>
      </div>
      <div class="min-h-0 flex-1">
        <DiagnosticsPanel />
      </div>
    </div>
  </div>
</template>
