import { AbstractRemote } from '@journeyapps/powersync-sdk-common';

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
    const credentials = await this.getCredentials();

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

    if (!res.ok) {
      const text = await res.text();
      console.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }
    return res.body;
  }
}
