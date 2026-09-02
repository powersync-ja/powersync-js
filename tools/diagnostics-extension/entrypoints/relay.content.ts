import type { Envelope, WindowRelayMessage } from '../lib/envelope';

/** Isolated-world relay: bridges the chrome.runtime port and the page `window`. */
export default defineContentScript({
  matches: ['http://localhost/*'],
  main() {
    const port = chrome.runtime.connect({ name: 'ps-diag-cs' });

    // MAIN-world bridge → background → panel
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as WindowRelayMessage | undefined;
      if (data?.__psDiag === 'fromAgent') {
        port.postMessage({ kind: 'wire', msg: data.msg } satisfies Envelope);
      }
    });

    // panel → background → MAIN-world bridge
    port.onMessage.addListener((env: Envelope) => {
      if (env.kind === 'wire') {
        window.postMessage({ __psDiag: 'toAgent', msg: env.msg } satisfies WindowRelayMessage, '*');
      }
    });
  }
});
