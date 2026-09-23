import { createApp, h, ref } from 'vue';
import { awaitIntegration, type SdkIntegration } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics } from '../src';
import { connectDevframeIntegration } from './devframeIntegration';
import '../src/style.css';

// Embed contract: this page runs in an iframe and drives everything through one `SdkIntegration`.
// Two hosts provide it. A devframe host (Vite DevTools dock, standalone window) answers over RPC.
// Any other host (Flutter DevTools, a plain page) serves it on a `MessagePort` and hands it over.
// Both arrive asynchronously, so the promise is provided during setup and the panel renders once
// it resolves.
async function resolveIntegration(): Promise<SdkIntegration> {
  return (await connectDevframeIntegration()) ?? (await awaitIntegration());
}

// A host that owns the theme says so in the URL (`?theme=dark|light`); Flutter DevTools passes its
// theme to extensions this way. The panel then follows the host and shows no toggle.
function hostTheme(): 'light' | 'dark' | undefined {
  const theme = new URLSearchParams(location.search).get('theme');
  return theme === 'dark' || theme === 'light' ? theme : undefined;
}

createApp({
  setup() {
    const pending = resolveIntegration();
    const ready = ref(false);
    provideDiagnostics(pending, { theme: hostTheme() });
    void pending.then(() => (ready.value = true));
    // The panel applies `.dark` to its own root; no host-forced class.
    return () =>
      h('div', { style: 'height: 100vh' }, [
        ready.value
          ? h(DiagnosticsPanel)
          : h(
              'div',
              { style: 'padding:1rem;opacity:.6;font:12px system-ui' },
              'Waiting for the diagnostics integration…'
            )
      ]);
  }
}).mount('#app');
