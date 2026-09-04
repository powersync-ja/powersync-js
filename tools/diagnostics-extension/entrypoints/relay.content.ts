import type { Envelope, WindowRelayMessage } from '../lib/envelope';

/** Isolated-world relay: bridges the chrome.runtime port and the page `window`. */
export default defineContentScript({
  matches: ['http://localhost/*'],
  main() {
    let port: chrome.runtime.Port;

    // Reconnect if the background service worker is torn down, so routing survives its restart.
    const connect = () => {
      port = chrome.runtime.connect({ name: 'ps-diag-cs' });
      // panel → background → MAIN-world bridge
      port.onMessage.addListener((env: Envelope) => {
        if (env.kind === 'wire') {
          window.postMessage({ __psDiag: 'toAgent', msg: env.msg } satisfies WindowRelayMessage, '*');
        }
      });
      port.onDisconnect.addListener(() => {
        // Extension context invalidated (e.g. reload) throws on reconnect; then this content script is dead anyway.
        try {
          connect();
        } catch {
          // no-op
        }
      });
    };
    connect();

    // MAIN-world bridge → background → panel
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as WindowRelayMessage | undefined;
      if (data?.__psDiag === 'fromAgent') {
        try {
          port.postMessage({ kind: 'wire', msg: data.msg } satisfies Envelope);
        } catch {
          // Port momentarily down; onDisconnect reconnects and the client re-syncs.
        }
      }
    });
  }
});
