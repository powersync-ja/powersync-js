<template>
  <div class="ps-diagnostics-root">
    <DiagnosticsPanel />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { BroadcastChannelTransport, DiagnosticsClient } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics } from '@powersync/diagnostics-ui';
import '@powersync/diagnostics-ui/style.css';
// @ts-ignore
import { definePageMeta } from '#imports';

definePageMeta({ layout: false });

// The agent runs on the app's real client in the top window; here we only connect a client.
const client = new DiagnosticsClient(new BroadcastChannelTransport());
provideDiagnostics(client);

onMounted(() => client.start());
onBeforeUnmount(() => client.stop());
</script>

<style>
html,
body,
#__nuxt {
  height: 100%;
  margin: 0;
}
.ps-diagnostics-root {
  height: 100vh;
}
</style>
