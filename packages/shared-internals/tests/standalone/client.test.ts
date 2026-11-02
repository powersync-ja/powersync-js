import { describe, expect, test } from 'vitest';
import { LocalWriteState, PowerSyncClient, RestartSyncError } from '../../src/standalone';
import { StreamingSyncLine } from '../../src/standalone/sync_protocol';

/**
 * A mock sync service. Each request gets a response stream that only closes when the request is aborted, mirroring how
 * `fetch` errors response streams on abort.
 */
class MockService {
  readonly requestedUrls: string[] = [];
  #controllers: ReadableStreamDefaultController<Uint8Array>[] = [];

  fetch: typeof fetch = async (input, init) => {
    this.requestedUrls.push(String(input));
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.#controllers.push(controller);
        init?.signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
      }
    });
    return new Response(body, { status: 200 });
  };

  push(line: StreamingSyncLine) {
    this.#controllers.at(-1)!.enqueue(new TextEncoder().encode(JSON.stringify(line) + '\n'));
  }
}

function setup() {
  const service = new MockService();
  const localWrites = new LocalWriteState();
  const client = new PowerSyncClient({ localWrites, fetch: service.fetch });
  return { service, localWrites, client };
}

const syncRequest = { endpoint: 'https://example.com/powersync', token: 'token', clientId: 'client' };

describe('PowerSyncClient', () => {
  test('keeps endpoint path prefix', async () => {
    const { service, client } = setup();
    const iterator = client.streamingSync(syncRequest);
    await iterator.next();
    await iterator.return(undefined);

    expect(service.requestedUrls).toStrictEqual(['https://example.com/powersync/sync/stream']);
  });

  test('reports restart errors instead of abort errors', async () => {
    const { service, client } = setup();
    const iterator = client.streamingSync(syncRequest);
    expect(await iterator.next()).toStrictEqual({ done: false, value: { type: 'headersReceived' } });

    service.push({ checkpoint: { last_op_id: '1', buckets: [{ bucket: 'a', checksum: 1 }] } });
    service.push({ checkpoint_complete: { last_op_id: '1' } });
    await expect(iterator.next()).rejects.toBeInstanceOf(RestartSyncError);
  });

  test('resets state after errors when retrying checkpoint', async () => {
    const { service, client, localWrites } = setup();
    let iterator = client.streamingSync(syncRequest);
    await iterator.next();

    localWrites.hasLocalWrites = true;
    service.push({ checkpoint: { last_op_id: '1', buckets: [{ bucket: 'a', checksum: 1 }] } });
    service.push({ checkpoint_complete: { last_op_id: '1' } });
    expect(await iterator.next()).toStrictEqual({ done: false, value: { type: 'blockedDueToLocalData' } });

    localWrites.hasLocalWrites = false;
    client.retryCheckpoint();
    await expect(iterator.next()).rejects.toBeInstanceOf(RestartSyncError);

    // The next connection must start from scratch instead of reusing the inconsistent bucket.
    iterator = client.streamingSync(syncRequest);
    await iterator.next();
    service.push({ checkpoint: { last_op_id: '0', buckets: [] } });
    service.push({ checkpoint_complete: { last_op_id: '0' } });
    expect(await iterator.next()).toStrictEqual({
      done: false,
      value: { type: 'rows', changes: { updatedRows: new Map() } }
    });
    await iterator.return(undefined);
  });
});
