import { AbortOperation, AbstractRemote } from '@powersync/common';

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
     * This abort controller will abort pending fetch requests.
     * If the request has resolved, it will be used to close the readable stream.
     * Which will cancel the network request.
     *
     * This nested controller is required since:
     *  Aborting the active fetch request while it is being consumed seems to throw
     *  an unhandled exception on the window level.
     */
    const controller = new AbortController();
    let requestResolved = false;
    signal?.addEventListener('abort', () => {
      if (!requestResolved) {
        // Only abort via the abort controller if the request has not resolved yet
        controller.abort(
          signal.reason ??
            new AbortOperation('Cancelling network request before it resolves. Abort signal has been received.')
        );
      }
    });

    const res = await fetch(request.url, {
      method: 'POST',
      headers: { ...headers, ...request.headers },
      body: JSON.stringify(data),
      signal: controller.signal,
      cache: 'no-store'
    }).catch((ex) => {
      if (ex.name == 'AbortError') {
        throw new AbortOperation(`Pending fetch request to ${request.url} has been aborted.`);
      }
      throw ex;
    });

    if (!res) {
      throw new Error('Fetch request was aborted');
    }

    requestResolved = true;

    if (!res.ok || !res.body) {
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
     */
    const reader = res.body.getReader();
    // This will close the network request and read stream
    const closeReader = async () => {
      try {
        await reader.cancel();
      } catch (ex) {
        // an error will throw if the reader hasn't been used yet
      }
      reader.releaseLock();
    };

    signal?.addEventListener('abort', () => {
      closeReader();
    });

    const outputStream = new ReadableStream({
      start: (controller) => {
        const processStream = async () => {
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
              this.logger.error('Caught exception when reading sync stream', ex);
              break;
            }
          }
          if (!signal?.aborted) {
            // Close the downstream readable stream
            await closeReader();
          }
          controller.close();
        };
        processStream();
      }
    });

    // Create a new response out of the intercepted stream
    return new Response(outputStream).body;
  }
}
