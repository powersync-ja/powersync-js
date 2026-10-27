import { createApp, h, ref } from 'vue';
import { DiagnosticsPanel, provideDiagnostics } from '@powersync/diagnostics-ui';
import '@powersync/diagnostics-ui/style.css';
import { RozeniteIntegration } from './integration.js';

// The PowerSync panel in React Native DevTools. Rozenite loads this page in an iframe and carries
// the plugin channel to the app; the integration arrives once the channel is ready.
createApp({
  setup() {
    const pending = RozeniteIntegration.connect();
    const ready = ref(false);
    provideDiagnostics(pending, { sdks: ['react-native'] });
    void pending.then(() => (ready.value = true));
    return () =>
      h('div', { style: 'height: 100vh' }, [
        ready.value
          ? h(DiagnosticsPanel)
          : h(
              'div',
              { style: 'padding: 12px; font: 12px system-ui; color: #888' },
              'Connecting to the app…'
            )
      ]);
  }
}).mount('#app');
