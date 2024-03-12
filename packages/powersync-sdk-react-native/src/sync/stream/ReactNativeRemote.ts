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

    const res = await fetch(request.url, {
      method: 'POST',
      headers: { ...headers, ...request.headers },
      body: JSON.stringify(data),
      signal,
      cache: 'no-store',
      /**
       * The `react-native-fetch-api` polyfill provides streaming support via
       * this non-standard flag
       * https://github.com/react-native-community/fetch#enable-text-streaming
       */
      // @ts-expect-error https://github.com/react-native-community/fetch#enable-text-streaming
      reactNative: { textStreaming: true }
    }).catch((ex) => {
      console.error(`Caught ex when POST streaming to ${path}`, ex);
      throw ex;
    });

    if (timeout != null) {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    /**
     * The can-ndjson-stream does not handle aborted streams well on web.
     * This will intercept the readable stream and close the stream if
     * aborted.
     * TODO this function is duplicated in the Web SDK.
     * The common SDK is a bit oblivious to `ReadableStream` classes.
     * This should be improved when moving to Websockets
     */
    const reader = res.body!.getReader();
    const outputStream = new ReadableStream({
      start(controller) {
        return processStream();

        async function processStream(): Promise<void> {
          if (signal?.aborted) {
            controller.close();
          }
          try {
            const { done, value } = await reader.read();
            // When no more data needs to be consumed, close the stream
            if (done) {
              controller.close();
              return;
            }
            // Enqueue the next data chunk into our target stream
            controller.enqueue(value);
            return processStream();
          } catch (ex) {
            controller.close();
          }
        }
      }
    });

    return new Response(outputStream).body;
  }
}
