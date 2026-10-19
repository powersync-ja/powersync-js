import { checkpointId, LocalWriteState, MutationGuard, RequestedCheckpoint } from './checkpoints.js';
import { DownloadChanges, DownloadClientState, RestartSyncError } from './download/buckets.js';
import { StreamingSyncLine } from './download/protocol.js';
import { extractJsonLines, injectable, map } from '@powersync/shared-internals/for_tiny_client';

export interface Authenticator {
  /**
   * The PowerSync service to connect to.
   */
  endpoint: string;

  resolveToken(abort: AbortSignal): Promise<string>;
  invalidateToken?(): void;
}

export type ClientEvent = DownloadChanges | 'reset';

export interface ClientOptions {
  authenticator: Authenticator;
  clientId: string;
  parameters: Record<string, unknown>;
  metadata?: Record<string, string>;

  handleEvent: (event: ClientEvent) => void;
  abort?: AbortSignal;
  fetch: () => Promise<Response>;
}

export interface SubscribeToStreamOptions {
  parameters: Record<string, unknown>;
  priority?: number;
}

export class PowerSyncClient {
  #options: ClientOptions;
  #handleEvent: (event: ClientEvent) => void;
  #abort: AbortSignal;

  #writeState = new LocalWriteState();
  #nextCheckpointRequestId = 1n;
  #downloadClient: DownloadClientState | undefined;

  constructor(options: ClientOptions) {
    this.#options = options;
    this.#handleEvent = options.handleEvent;
    this.#abort = options.abort ?? new AbortController().signal;
  }

  async connect() {
    await Promise.all([this.#downloadLoop()]);
  }

  #serviceUrl(path: string): URL {
    return new URL(path, this.#options.authenticator.endpoint);
  }

  async #downloadLoop() {
    while (!this.#abort.aborted) {
      let reconnectImmediately = false;

      try {
        reconnectImmediately = await this.#downloadIteration(
          (this.#downloadClient ??= new DownloadClientState(this.#writeState))
        );
      } catch (e) {
        reconnectImmediately = false;

        if (e instanceof RestartSyncError) {
          if (e.clearLocal) {
            // Recovering from this error requires clearing sync state.
            this.#downloadClient = undefined;
            this.#handleEvent('reset');
          }
        }
      }

      if (!reconnectImmediately) {
        // TODO: Delay
      }
    }
  }

  subscribeToStream(name: string, options: SubscribeToStreamOptions): () => void {
    throw new Error('TODO');
  }

  /**
   * Creates a mutation guard, preventing new checkpoints from syncing until this local mutation has been acknowledged
   * by PowerSync.
   */
  mutationGuard(): MutationGuard {
    return this.#writeState.mutationGuard();
  }

  /**
   * Requests a checkpoint from the PowerSync service.
   *
   * Once local writes have been uploaded, pass the returned checkpoint to {@link MutationGuard.completeWith} to delay
   * applying synced data until the service has caught up with those writes.
   */
  async requestCheckpoint(): Promise<RequestedCheckpoint> {
    const requestId = this.#nextCheckpointRequestId++;

    const response = await this.#postToService(
      '/sync/checkpoint-request',
      { client_id: this.#options.clientId, checkpoint_request_id: requestId.toString() },
      'application/json',
      this.#abort
    );

    const body = (await response.json()) as { data: { checkpoint_request_id: string } };
    const checkpoint = BigInt(body.data.checkpoint_request_id);
    if (checkpoint >= this.#nextCheckpointRequestId) {
      // The service has already seen a higher checkpoint request for this user and client id (e.g. from a previous
      // session). Continue after that so that subsequent requests can still be told apart.
      this.#nextCheckpointRequestId = checkpoint + 1n;
    }

    return { [checkpointId]: checkpoint };
  }

  /**
   * Sends an authenticated POST request to the PowerSync service, throwing if it doesn't complete successfully.
   */
  async #postToService(path: string, body: unknown, accept: string, signal: AbortSignal): Promise<Response> {
    const authenticator = this.#options.authenticator;
    const response = await fetch(this.#serviceUrl(path), {
      method: 'POST',
      signal,
      body: JSON.stringify(body),
      headers: {
        Accept: accept,
        'Content-Type': 'application/json',
        Authorization: `Token ${await authenticator.resolveToken(signal)}`
      }
    });

    if (response.status != 200) {
      if (response.status == 401 || response.status == 403) {
        authenticator.invalidateToken?.();
      }

      throw new Error(`Error from ${path} response: ${await response.text()}`);
    }

    return response;
  }

  async #downloadIteration(client: DownloadClientState): Promise<boolean> {
    const options = this.#options;
    const request = client.prepareConnectRequest(
      options.clientId,
      options.parameters,
      { include_defaults: true, subscriptions: [] },
      options.metadata
    );

    // Aborted when the outer signal is aborted, or when this iteration completes.
    const iterationAbort = new AbortController();
    const signal = AbortSignal.any([this.#abort, iterationAbort.signal]);

    let isPrefetchingToken = false;

    try {
      const response = await this.#postToService('/sync/stream', request, 'application/x-ndjson', signal);
      const body = response.body;
      if (body == null) {
        throw new Error('Response from /sync/stream has no body');
      }
      const reader = body.getReader();
      const lines = extractJsonLines(
        { next: async () => (await reader.read()) as IteratorResult<Uint8Array> },
        new TextDecoder()
      );

      // Sync lines from the service, merged with local events that affect this iteration. Handling everything from a
      // single loop avoids having to interrupt the line stream from outside.
      const events = injectable<IterationEvent>(
        map(lines, (line) => ({ type: 'line', line: JSON.parse(line) as StreamingSyncLine }))
      );

      while (true) {
        const { done, value: event } = await events.next();
        if (done) {
          break;
        }

        switch (event.type) {
          case 'line': {
            const line = event.line;
            if ('token_expires_in' in line) {
              const remainingSeconds = line.token_expires_in;
              if (remainingSeconds == 0) {
                // The token has already expired, so the service will close the connection. Fetch a new token before
                // reconnecting.
                options.authenticator.invalidateToken?.();
                return false;
              } else if (remainingSeconds <= 30 && !isPrefetchingToken) {
                // The token expires soon. Keep the current connection open while fetching a new one, and reconnect
                // once that completes.
                isPrefetchingToken = true;
                options.authenticator.invalidateToken?.();
                options.authenticator.resolveToken(signal).then(
                  () => events.inject({ type: 'token_refreshed' }),
                  () => {
                    // Ignore, we'll try to fetch the token again when reconnecting.
                  }
                );
              }
            } else {
              client.push(line);
            }
            break;
          }
          case 'token_refreshed':
            // Reconnect with the new token.
            return true;
        }
      }
    } finally {
      iterationAbort.abort();
    }

    return false;
  }
}

type IterationEvent = { type: 'line'; line: StreamingSyncLine } | { type: 'token_refreshed' };
