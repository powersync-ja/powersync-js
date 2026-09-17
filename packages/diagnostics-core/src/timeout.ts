import type { DiagnosticsEvent, SdkIntegration } from './integration.js';
import type { Unsubscribe } from './shapes.js';

/** A request to an integration that did not answer in time. `method` names the call that hung. */
export class DiagnosticsRequestTimeoutError extends Error {
  constructor(
    readonly method: keyof SdkIntegration,
    readonly timeoutMs: number
  ) {
    super(`The diagnostics integration did not answer ${method}() within ${timeoutMs}ms.`);
    this.name = 'DiagnosticsRequestTimeoutError';
  }
}

export interface RequestTimeoutOptions {
  /** How long a request may take before it fails. */
  timeoutMs: number;
}

const withTimeout = <T>(method: keyof SdkIntegration, request: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new DiagnosticsRequestTimeoutError(method, timeoutMs)), timeoutMs);
    request.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

/**
 * An integration whose requests fail instead of hanging.
 *
 * Over a bridge, a request to an integration whose other side has gone stays pending forever: nothing
 * is left to answer it. Wrapping the integration bounds every request, so a query or action fails
 * with a {@link DiagnosticsRequestTimeoutError} the host can show. `observeEvents` is bounded only
 * while subscribing; the events themselves arrive whenever they arrive. `close` is not bounded, since
 * giving up on it changes nothing.
 */
export function withRequestTimeout(integration: SdkIntegration, options: RequestTimeoutOptions): SdkIntegration {
  const { timeoutMs } = options;
  return {
    runQuery: (params) => withTimeout('runQuery', integration.runQuery(params), timeoutMs),
    getSchema: () => withTimeout('getSchema', integration.getSchema(), timeoutMs),
    getInfo: () => withTimeout('getInfo', integration.getInfo(), timeoutMs),
    currentSyncStatus: () => withTimeout('currentSyncStatus', integration.currentSyncStatus(), timeoutMs),
    getUploadQueueStats: () => withTimeout('getUploadQueueStats', integration.getUploadQueueStats(), timeoutMs),
    action: (request) => withTimeout('action', integration.action(request), timeoutMs),
    observeEvents: (handler: (event: DiagnosticsEvent) => void): Promise<Unsubscribe> =>
      withTimeout('observeEvents', integration.observeEvents(handler), timeoutMs),
    close: () => integration.close()
  };
}
