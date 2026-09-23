<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { connectIntegration, exposeIntegration } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics, useTheme } from '../src';
import { MockIntegration } from './mockIntegration';

// The panel owns the theme (toggle lives in its header); the harness follows the same shared state.
const { isDark } = useTheme();

// Preview the broken/no-client onboarding screen: open http://localhost:5199/?noclient
const noClient = new URLSearchParams(location.search).has('noclient');

// The harness plays the SDK side: a fake integration that answers the protocol with canned data.
const mock = new MockIntegration();

// A real MessageChannel hop, so the playground exercises the same comlink bridge the iframe hosts use
// (structured clone included — anything non-serializable fails here, not in a host).
const channel = new MessageChannel();
const stopServing = noClient ? () => {} : exposeIntegration(mock, channel.port1);
const integration = connectIntegration(channel.port2);

provideDiagnostics(integration);

onMounted(() => {
  if (!noClient) {
    mock.simulate();
  }
});

onUnmounted(() => {
  void integration.close();
  stopServing();
  void mock.close();
});
</script>

<template>
  <div :class="[isDark ? 'dark' : '', 'h-screen w-screen bg-background']">
    <div class="flex h-full flex-col">
      <div class="border-b bg-card px-4 py-1 text-[11px] text-muted-foreground">
        diagnostics-ui playground · comlink bridge over MessageChannel · mock integration
      </div>
      <div class="min-h-0 flex-1">
        <DiagnosticsPanel />
      </div>
    </div>
  </div>
</template>
