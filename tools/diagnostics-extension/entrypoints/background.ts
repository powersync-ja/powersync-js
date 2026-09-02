import type { Envelope } from '../lib/envelope';

/** Routes wire messages between each tab's content-script relay and its DevTools panel. */
export default defineBackground(() => {
  const contentPorts = new Map<number, chrome.runtime.Port>();
  const panelPorts = new Map<number, chrome.runtime.Port>();

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'ps-diag-cs') {
      const tabId = port.sender?.tab?.id;
      if (tabId == null) return;
      contentPorts.set(tabId, port);
      port.onMessage.addListener((env: Envelope) => panelPorts.get(tabId)?.postMessage(env));
      port.onDisconnect.addListener(() => {
        if (contentPorts.get(tabId) === port) contentPorts.delete(tabId);
      });
    } else if (port.name === 'ps-diag-panel') {
      let tabId: number | undefined;
      port.onMessage.addListener((env: Envelope) => {
        if (env.kind === 'init') {
          tabId = env.tabId;
          panelPorts.set(tabId, port);
          return;
        }
        if (tabId != null) contentPorts.get(tabId)?.postMessage(env);
      });
      port.onDisconnect.addListener(() => {
        if (tabId != null && panelPorts.get(tabId) === port) panelPorts.delete(tabId);
      });
    }
  });
});
