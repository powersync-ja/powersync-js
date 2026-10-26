import * as Comlink from 'comlink';
import type { SdkIntegration } from './integration.js';
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

/**
 * Sent by the UI side to ask the host for a dedicated port. Its `requestId` stays the same when the UI
 * repeats the request.
 */
export const REQUEST_PORT_MESSAGE = 'powersync-diagnostics:request-port';
/** Sent by the integration side to hand the UI its dedicated port, with the `requestId` it answers. */
export const PORT_MESSAGE = 'powersync-diagnostics:port';

/**
 * Serves an integration on `port` — call on the side that owns the {@link SdkIntegration}.
 * Returns a function that stops serving. Stopping also ends every event subscription the UI made through the port.
 */
export function exposeIntegration(integration: SdkIntegration, port: MessagePort): () => void {
  // A UI that goes away, such as a page that reloads, never unsubscribes, so stopping has to do it.
  const subscriptions = new Set<Unsubscribe>();
  let isStopped = false;
  // Callbacks and the returned unsubscribe cross the boundary as comlink proxies.
  const remote: SdkIntegration = {
    runQuery: (params) => integration.runQuery(params),
    getSchema: () => integration.getSchema(),
    getInfo: () => integration.getInfo(),
    action: (request) => integration.action(request),
    close: () => integration.close(),
    async observeEvents(handler) {
      const unsubscribe = await integration.observeEvents((event) => {
        void handler(event);
      });
      // If serving stopped while this call was waiting, nothing will unsubscribe later, so do it now.
      if (isStopped) {
        unsubscribe();
        return Comlink.proxy(() => {});
      }
      subscriptions.add(unsubscribe);
      return Comlink.proxy(() => {
        subscriptions.delete(unsubscribe);
        unsubscribe();
      });
    }
  };
  Comlink.expose(remote, port);
  port.start();
  return () => {
    isStopped = true;
    for (const unsubscribe of subscriptions) {
      unsubscribe();
    }
    subscriptions.clear();
    port.close();
  };
}

/**
 * Connects to an integration served on `port` — call on the UI side.
 * The returned object implements {@link SdkIntegration} over the boundary.
 */
export function connectIntegration(port: MessagePort): SdkIntegration {
  const remote = Comlink.wrap<SdkIntegration>(port);
  port.start();
  return {
    runQuery: (params) => remote.runQuery(params),
    getSchema: () => remote.getSchema(),
    getInfo: () => remote.getInfo(),
    action: (request) => remote.action(request),
    async close() {
      await remote.close();
      remote[Comlink.releaseProxy]();
      port.close();
    },
    async observeEvents(handler) {
      const unsubscribe = await remote.observeEvents(Comlink.proxy(handler));
      return () => {
        void unsubscribe();
      };
    }
  };
}

/** Options for {@link attachIframe}. */
export interface AttachIframeOptions {
  /**
   * Only a page from this origin gets the port, because the port can run any SQL and read the sync
   * token. It accepts the same values as `postMessage`: an origin or a URL on it, `'/'` for this
   * page's own origin, or `'*'` for any origin. It defaults to the origin of the frame's `src`.
   */
  targetOrigin?: string;
  /** Called each time a page in the frame is handed its port, on the first load and again after every reload. */
  onHandOff?: () => void;
}

/**
 * Host side of the iframe hand-off: answers the iframe's port requests with a dedicated channel that
 * serves `integration`. It waits to be asked because a new iframe's blank placeholder already reports
 * `complete`, and a port posted to it is lost when the real page loads. The page repeats its request
 * until a port arrives and keeps the first port it gets, so a repeated request is ignored. A request
 * with a new id means the page reloaded, so it replaces the channel of the page before. Returns a
 * function that stops serving.
 */
export function attachIframe(
  integration: SdkIntegration,
  frame: HTMLIFrameElement,
  options: AttachIframeOptions = {}
): () => void {
  // Resolve the origin now, so an invalid one throws when attaching instead of on the first request.
  const fixedOrigin = options.targetOrigin === undefined ? null : resolveTargetOrigin(options.targetOrigin);
  const stops = new Set<() => void>();
  let pageRequestId: unknown;
  const stopAll = () => {
    for (const stop of stops) {
      stop();
    }
    stops.clear();
  };

  const onMessage = (event: MessageEvent) => {
    const uiWindow = frame.contentWindow;
    if (!uiWindow || event.source !== uiWindow || event.data?.type !== REQUEST_PORT_MESSAGE) {
      return;
    }
    // Read the frame's `src` on every request, so the host can set or change it after attaching.
    const origin = fixedOrigin ?? (frame.src ? new URL(frame.src).origin : null);
    if (origin === null || (origin !== '*' && event.origin !== origin)) {
      return;
    }
    const requestId: unknown = event.data.requestId;
    if (requestId !== undefined) {
      // The page is repeating a request whose port is already on the way.
      if (requestId === pageRequestId) {
        return;
      }
      // A new page loaded in the frame, so nothing uses the channels of the page before it.
      stopAll();
      pageRequestId = requestId;
    }
    // Pages built before request ids send none. Their retries look like reloads, so their channels stay until detach.
    const channel = new MessageChannel();
    stops.add(exposeIntegration(integration, channel.port1));
    uiWindow.postMessage({ type: PORT_MESSAGE, requestId }, origin, [channel.port2]);
    options.onHandOff?.();
  };
  window.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('message', onMessage);
    stopAll();
  };
}

/**
 * Returns the origin that `postMessage` delivers to for `targetOrigin`. Throws on an invalid value, as
 * `postMessage` does.
 */
function resolveTargetOrigin(targetOrigin: string): string {
  if (targetOrigin === '*') {
    return '*';
  }
  return targetOrigin === '/' ? window.location.origin : new URL(targetOrigin).origin;
}

/**
 * UI side of the iframe hand-off: resolves once a host posts the dedicated port.
 *
 * Hosts serve ports on request (see {@link attachIframe}): the UI posts a request to its ancestors,
 * retrying until a port arrives, so it also recovers when the host's script loads after the iframe.
 * Every retry carries the same id, so a host can tell a retry from a reloaded page.
 */
export function awaitIntegration(options: { requestIntervalMs?: number } = {}): Promise<SdkIntegration> {
  const interval = options.requestIntervalMs ?? 500;
  // crypto.randomUUID() needs a secure context, and the page may be served over plain http.
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const listener = (event: MessageEvent) => {
      const port = event.ports?.[0];
      // A port answering another id was meant for the page before a reload. Hosts before request ids send none.
      const isForThisPage = event.data?.requestId === undefined || event.data.requestId === requestId;
      if (event.data?.type === PORT_MESSAGE && port && isForThisPage) {
        window.removeEventListener('message', listener);
        if (timer) clearInterval(timer);
        resolve(connectIntegration(port));
      }
    };
    window.addEventListener('message', listener);

    // The page that serves ports may be any ancestor, not only the direct parent: a DevTools host
    // often nests the UI inside its own iframe, so the app page is `top` and `parent` is the host.
    const targets = ancestors();
    const request = () => {
      for (const ancestor of targets) {
        ancestor.postMessage({ type: REQUEST_PORT_MESSAGE, requestId }, '*');
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
