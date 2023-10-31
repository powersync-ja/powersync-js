import { AbstractRemote } from '@journeyapps/powersync-sdk-common';
import { Platform } from 'react-native';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

export class ReactNativeRemote extends AbstractRemote {
  async post(path: string, data: any, headers: Record<string, string> = {}): Promise<any> {
    const credentials = await this.getCredentials();
    const res = await fetch(credentials.endpoint + path, {
      method: 'POST',
      headers: {
        ...headers,
        ...(await this.getHeaders())
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`Received ${res.status} - ${res.statusText} when posting to ${path}: ${await res.text()}}`);
    }

    return res.json();
  }

  async get(path: string, headers?: Record<string, string>): Promise<any> {
    const credentials = await this.getCredentials();

    const res = await fetch(credentials.endpoint + path, {
      method: 'GET',
      headers: {
        ...headers,
        ...(await this.getHeaders())
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

    const credentials = await this.getCredentials();

    let timeout =
      Platform.OS == 'android'
        ? setTimeout(() => {
            this.logger.warn(
              `HTTP Streaming POST is taking longer than 30 seconds to resolve. If using a debug build, please ensure Flipper Network plugin is disabled.`
            );
          }, STREAMING_POST_TIMEOUT_MS)
        : null;

    const res = await fetch(credentials.endpoint + path, {
      method: 'POST',
      headers: { ...headers, ...(await this.getHeaders()) },
      body: JSON.stringify(data),
      signal,
      cache: 'no-store',
      /**
       * The `react-native-fetch-api` polyfill provides streaming support via
       * this non-standard flag
       * https://github.com/react-native-community/fetch#enable-text-streaming
       */
      // @ts-ignore
      reactNative: { textStreaming: true }
    }).catch((ex) => {
      console.error(`Caught ex when POST streaming to ${path}`, ex);
      throw ex;
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    return res.body;
  }
}
