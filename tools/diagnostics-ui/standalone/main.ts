import { createApp, h, ref } from 'vue';
import { awaitIntegration as receiveFromIframe, type SdkIntegration } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics } from '../src';
import { tryAppServer } from './appIntegration';
import { DevframeIntegration, tryDevframe } from './devframeIntegration';
import { useHostTheme } from './hostTheme';
import { sdksFromUrl } from './hostSdks';
import '../src/style.css';

// Embed contract: this page drives everything through one `SdkIntegration`. Three hosts provide it.
// A native app (Swift, Kotlin) serves this page itself and answers over HTTP (`appIntegration.ts`).
// A devframe host (Vite DevTools dock, standalone window) answers over RPC. Any other host (Flutter
// DevTools, a plain page) serves it on a `MessagePort` and hands it over. All arrive asynchronously,
// so the promise is provided during setup and the panel renders once it resolves.
async function resolveIntegration(): Promise<SdkIntegration> {
  return (await tryAppServer()) ?? (await tryDevframe()) ?? (await receiveFromIframe());
}

// A host that owns the theme says so through the page URL or a theme message (see `hostTheme.ts`).
// The panel then follows the host and shows no toggle; with neither, it manages its own theme.

// The SDKs the host can reach narrow the "no database" screens. An embedder names them on the URL
// (`?sdks=dart`); a devframe host knows which entry point mounted it and answers over RPC.

createApp({
  setup() {
    const pending = resolveIntegration();
    const ready = ref(false);
    const sdks = ref(sdksFromUrl());
    provideDiagnostics(pending, { theme: useHostTheme(), sdks });
    void pending.then(async (integration) => {
      ready.value = true;
      if (!sdks.value && integration instanceof DevframeIntegration) sdks.value = await integration.getSetupSdks();
    });
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
