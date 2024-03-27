import { AbstractRemote } from '@journeyapps/powersync-sdk-common';
import { Platform } from 'react-native';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

export class ReactNativeRemote extends AbstractRemote {
  async post(path: string, data: any, headers: Record<string, string> = {}): Promise<any> {
    const request = await this.buildRequest(path);
    const res = await fetch(request.url, {
      method: 'POST',
      headers: {
        ...headers,
        ...request.headers
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when posting to ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  async get(path: string, headers?: Record<string, string>): Promise<any> {
    const request = await this.buildRequest(path);

    const res = await fetch(request.url, {
      method: 'GET',
      headers: {
        ...headers,
        ...request.headers
      }
    });

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when getting from ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  async postStreaming(
    path: string,
    data: any,
    headers: Record<string, string> = {},
    signal?: AbortSignal
  ): Promise<any> {
    // Ensure polyfills are present
    if (
      typeof ReadableStream == 'undefined' ||
      typeof TextEncoder == 'undefined' ||
      typeof TextDecoder == 'undefined'
    ) {
      const errorMessage = `Polyfills are undefined. Please ensure React Native polyfills are installed and imported in the app entrypoint.
      "import 'react-native-polyfill-globals/auto';"
      `;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const request = await this.buildRequest(path);

    const timeout =
      Platform.OS == 'android'
        ? setTimeout(() => {
            this.logger.warn(
              `HTTP Streaming POST is taking longer than ${Math.ceil(
                STREAMING_POST_TIMEOUT_MS / 1000
              )} seconds to resolve. If using a debug build, please ensure Flipper Network plugin is disabled.`
            );
          }, STREAMING_POST_TIMEOUT_MS)
        : null;

    /**
     * This abort controller will abort the fetch request if it has not resolved yet.
     * If the request has resolved, it will be used to close the stream.
     * Aborting the request after the stream is resolved and is in use seems to throw
     * unhandled exceptions on the window level.
     */
    const controller = new AbortController();
    let requestResolved = false;
    signal?.addEventListener('abort', () => {
      if (!requestResolved) {
        // Only abort via the abort controller if the request has not resolved yet
        controller.abort(signal.reason);
      }
    });

    const res = await fetch(request.url, {
      method: 'POST',
      headers: { ...headers, ...request.headers },
      body: JSON.stringify(data),
      signal: controller.signal,
      cache: 'no-store',
      /**
       * The `react-native-fetch-api` polyfill provides streaming support via
       * this non-standard flag
       * https://github.com/react-native-community/fetch#enable-text-streaming
       */
      // @ts-expect-error https://github.com/react-native-community/fetch#enable-text-streaming
      reactNative: { textStreaming: true }
    }).catch((ex) => {
      // Handle abort requests which occur before the response resolves
      if (ex.name == 'AbortError') {
        this.logger.warn(`Fetch request for ${request.url} has been aborted`);
        return;
      }
      throw ex;
    });

    if (timeout != null) {
      clearTimeout(timeout);
    }

    if (!res) {
      throw new Error('Fetch request was aborted before resolving.');
    }

    requestResolved = true;

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    /**
     * The can-ndjson-stream does not handle aborted streams well.
     * This will intercept the readable stream and close the stream if
     * aborted.
     * TODO this function is duplicated in the Web SDK.
     * The common SDK is a bit oblivious to `ReadableStream` classes.
     * This should be improved when moving to Websockets
     */
    const reader = res.body!.getReader();
    signal?.addEventListener('abort', () => {
      // This will close the network request and read stream
      reader.cancel();
    });

    const outputStream = new ReadableStream({
      start(controller) {
        processStream();
        async function processStream(): Promise<void> {
          while (!signal?.aborted) {
            try {
              const { done, value } = await reader.read();
              // When no more data needs to be consumed, close the stream
              if (done) {
                break;
              }
              // Enqueue the next data chunk into our target stream
              controller.enqueue(value);
            } catch (ex) {
              console.error(ex);
              break;
            }
          }
          if (!signal?.aborted) {
            // Close the downstream readable stream
            reader.cancel();
          }
          controller.close();
          reader.releaseLock();
        }
      }
    });

    // Create a new response out of the intercepted stream
    return new Response(outputStream).body;
  }
}
