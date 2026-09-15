import * as Comlink from 'comlink';
import type { DiagnosticsEvent, SdkIntegration } from './integration.js';
import type { Unsubscribe } from './shapes.js';

/**
 * Moves an {@link SdkIntegration} across a `postMessage` boundary with comlink.
 *
 * The UI always runs in an iframe; the integration lives on the other side (the app page, or a host
 * that reaches the app another way). comlink turns the interface's method calls into messages and
 * correlates request/response itself, so the tool carries no wire format of its own. Each pairing
 * uses one dedicated `MessagePort`, so several UIs can attach to one integration without sharing a
 * channel.
 */

/** The shape exposed over comlink: `observeEvents` takes a proxied callback instead of a function. */
type Remote = Omit<SdkIntegration, 'observeEvents'> & {
  observeEvents(handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe>;
};

/** Sent by the UI side to ask the host for a dedicated port. */
export const REQUEST_PORT_MESSAGE = 'powersync-diagnostics:request-port';
/** Sent by the integration side to hand the UI its dedicated port. */
export const PORT_MESSAGE = 'powersync-diagnostics:port';

/**
 * Serves an integration on `port` — call on the side that owns the {@link SdkIntegration}.
 * Returns a function that stops serving.
 */
export function exposeIntegration(integration: SdkIntegration, port: MessagePort): () => void {
  const remote: Remote = {
    runQuery: (params) => integration.runQuery(params),
    getSchema: () => integration.getSchema(),
    getInfo: () => integration.getInfo(),
    currentSyncStatus: () => integration.currentSyncStatus(),
    getUploadQueueStats: () => integration.getUploadQueueStats(),
    action: (request) => integration.action(request),
    close: () => integration.close(),
    async observeEvents(handler) {
      const unsubscribe = integration.observeEvents((event) => {
        void handler(event);
      });
      return Comlink.proxy(unsubscribe);
    }
  };
  Comlink.expose(remote, port);
  port.start();
  return () => port.close();
}

/**
 * Connects to an integration served on `port` — call on the UI side.
 * The returned object implements {@link SdkIntegration} over the boundary.
 */
export function connectIntegration(port: MessagePort): SdkIntegration {
  const remote = Comlink.wrap<Remote>(port);
  port.start();
  return {
    runQuery: (params) => remote.runQuery(params),
    getSchema: () => remote.getSchema(),
    getInfo: () => remote.getInfo(),
    currentSyncStatus: () => remote.currentSyncStatus(),
    getUploadQueueStats: () => remote.getUploadQueueStats(),
    action: (request) => remote.action(request),
    async close() {
      await remote.close();
      remote[Comlink.releaseProxy]();
      port.close();
    },
    observeEvents(handler) {
      // The remote resolves to a proxied unsubscribe; keep the call synchronous for the caller.
      const pending = remote.observeEvents(Comlink.proxy(handler));
      let released = false;
      void pending.then((unsubscribe) => {
        if (released) {
          void unsubscribe();
        }
      });
      return () => {
        released = true;
        void pending.then((unsubscribe) => unsubscribe());
      };
    }
  };
}

/**
 * Host side of the iframe hand-off: creates a dedicated channel, serves `integration` on one end,
 * and posts the other end to the iframe. Returns a function that stops serving.
 */
export function attachIframe(integration: SdkIntegration, frame: HTMLIFrameElement, targetOrigin = '*'): () => void {
  const channel = new MessageChannel();
  const stop = exposeIntegration(integration, channel.port1);
  const send = () => frame.contentWindow?.postMessage({ type: PORT_MESSAGE }, targetOrigin, [channel.port2]);
  if (frame.contentDocument?.readyState === 'complete') {
    send();
  } else {
    frame.addEventListener('load', send, { once: true });
  }
  return stop;
}

/**
 * UI side of the iframe hand-off: resolves once a host posts the dedicated port.
 *
 * Works with either hand-off direction. A host that knows the iframe (see {@link attachIframe})
 * posts the port on load. A host that only serves ports on request (an in-page script the dock
 * cannot reference) is asked: the UI posts a request to its parent, retrying until a port arrives,
 * so it also recovers when the page's script loads after the iframe.
 */
export function awaitIntegration(options: { requestIntervalMs?: number } = {}): Promise<SdkIntegration> {
  const interval = options.requestIntervalMs ?? 500;
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const listener = (event: MessageEvent) => {
      const port = event.ports?.[0];
      if (event.data?.type === PORT_MESSAGE && port) {
        window.removeEventListener('message', listener);
        if (timer) clearInterval(timer);
        console.info('[powersync-diagnostics] ui: received an integration port from', event.origin);
        resolve(connectIntegration(port));
      }
    };
    window.addEventListener('message', listener);

    // The page that serves ports may be any ancestor, not only the direct parent: a DevTools host
    // often nests the UI inside its own iframe, so the app page is `top` and `parent` is the host.
    const targets = ancestors();
    console.info(`[powersync-diagnostics] ui: requesting an integration port from ${targets.length} ancestor frame(s)`);
    const request = () => {
      for (const ancestor of targets) {
        ancestor.postMessage({ type: REQUEST_PORT_MESSAGE }, '*');
      }
    };
    request();
    timer = setInterval(request, interval);
  });
}

/** Every frame above this one, nearest first. Cross-origin ancestors are still valid postMessage targets. */
function ancestors(): Window[] {
  const result: Window[] = [];
  let current: Window = window;
  while (current.parent && current.parent !== current) {
    result.push(current.parent);
    current = current.parent;
  }
  return result;
}
