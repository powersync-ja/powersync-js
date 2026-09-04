<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { DiagnosticsClient } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics } from '@powersync/diagnostics-ui';
import '@powersync/diagnostics-ui/style.css';
import { RuntimeTransport } from '../../lib/runtime-transport';

// The panel runs in the DevTools context and knows which tab it is inspecting.
const transport = new RuntimeTransport(chrome.devtools.inspectedWindow.tabId);
const client = new DiagnosticsClient(transport);
provideDiagnostics(client);

// On a background-worker restart the transport reconnects; re-announce so the agent replays state.
// Retry once to cover the case where the content-script port hasn't re-registered with the background yet.
transport.onReconnect = () => {
  client.resync();
  setTimeout(() => client.resync(), 600);
};

onMounted(() => client.start());
onBeforeUnmount(() => {
  client.stop();
  transport.dispose();
});
</script>

<template>
  <div class="dark" style="height: 100vh">
    <DiagnosticsPanel />
  </div>
</template>
