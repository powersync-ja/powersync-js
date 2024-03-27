import { AbstractRemote } from '@journeyapps/powersync-sdk-common';

export class WebRemote extends AbstractRemote {
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
    const request = await this.buildRequest(path);

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
      cache: 'no-store'
    }).catch((ex) => {
      // Handle abort requests which occur before the response resolves
      if (ex.name == 'AbortError') {
        this.logger.warn(`Fetch request for ${request.url} has been aborted`);
        return;
      }
      throw ex;
    });

    if (!res) {
      throw new Error('Fetch request was aborted before resolving.');
    }

    requestResolved = true;

    if (!res.ok || !res.body) {
      const text = await res.text();
      console.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
      const error: any = new Error(`HTTP ${res.statusText}: ${text}`);
      error.status = res.status;
      throw error;
    }

    /**
     * The can-ndjson-stream does not handle aborted streams well.
     * This will intercept the readable stream and close the stream if
     * aborted.
     */
    const reader = res.body.getReader();
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
