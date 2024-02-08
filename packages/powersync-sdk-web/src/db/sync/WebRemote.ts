import { AbstractRemote } from '@journeyapps/powersync-sdk-common';

export class WebRemote extends AbstractRemote {
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
      cache: 'no-store'
    });

    if (!res.ok || !res.body) {
      const text = await res.text();
      console.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    /**
     * The can-ndjson-stream does not handle aborted streams well on web.
     * This will intercept the readable stream and close the stream if
     * aborted.
     */
    const reader = res.body.getReader();
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

    // Create a new response out of the intercepted stream
    return new Response(outputStream).body;
  }
}
