import { createApp, h, ref } from 'vue';
import { awaitIntegration } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics } from '../src';
import '../src/style.css';

// Embed contract: this page runs in an iframe. The host serves an `SdkIntegration` on a dedicated
// `MessagePort` and hands it over; the UI drives everything through that object. The port arrives
// asynchronously, so the promise is provided during setup and the panel renders once it resolves.
createApp({
  setup() {
    const pending = awaitIntegration();
    const ready = ref(false);
    provideDiagnostics(pending);
    void pending.then(() => (ready.value = true));
    // The panel owns its own theme (self-applies `.dark`); no host-forced class.
    return () =>
      h('div', { style: 'height: 100vh' }, [
        ready.value ? h(DiagnosticsPanel) : h('div', { style: 'padding:1rem;opacity:.6;font:12px system-ui' }, 'Waiting for the diagnostics integration…')
      ]);
  }
}).mount('#app');
