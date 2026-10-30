import { expect, test as baseTest, vi } from 'vitest';
import {
  PowerSyncClient,
  StreamError,
  StreamLease,
  StreamLeaseOptions,
  type StreamSubscription,
  type TableChanges,
  type TableListener
} from '../src/index.js';

type Row = Record<string, unknown>;

/** A fake PowerSync service, serving one NDJSON response per sync request. */
class FakeService {
  readonly requests: Record<string, any>[] = [];
  /** Authorization headers of sync requests. */
  readonly tokens: string[] = [];
  readonly checkpointRequests: Record<string, any>[] = [];
  #stream?: ReadableStreamDefaultController<Uint8Array>;
  #signal?: AbortSignal;
  #opId = 0;
  /** Runs before responding to a checkpoint request. */
  beforeCheckpointResponse?: () => Promise<void>;

  readonly fetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const body = JSON.parse(String(init?.body));
    if (url.pathname == '/sync/checkpoint-request') {
      this.checkpointRequests.push(body);
      await this.beforeCheckpointResponse?.();
      return Response.json({ data: { checkpoint_request_id: body.checkpoint_request_id } });
    }

    this.requests.push(body);
    this.tokens.push((init!.headers as Record<string, string>).Authorization);
    const signal = (this.#signal = init!.signal!);
    return new Response(
      new ReadableStream({
        start: (c) => {
          this.#stream = c;
          signal.addEventListener('abort', () => {
            try {
              c.close();
            } catch {}
          });
        }
      })
    );
  };

  get aborted() {
    return this.#signal?.aborted ?? true;
  }

  get lastRequest() {
    return this.requests.at(-1)!;
  }

  async waitForRequest(count: number) {
    await vi.waitFor(() => expect(this.requests.length).toBe(count));
  }

  send(line: unknown) {
    this.#stream!.enqueue(new TextEncoder().encode(JSON.stringify(line) + '\n'));
  }

  close() {
    this.#stream!.close();
  }

  checkpoint(buckets: string[], options: { streams?: unknown[]; writeCheckpoint?: string } = {}) {
    const request = this.lastRequest;
    this.send({
      checkpoint: {
        last_op_id: String(this.#opId + 10),
        write_checkpoint: options.writeCheckpoint,
        buckets: buckets.map((bucket) => ({ bucket, checksum: 0 })),
        streams:
          options.streams ??
          request.streams.subscriptions.map((s: { stream: string }) => ({
            name: s.stream,
            is_default: false,
            errors: []
          }))
      }
    });
  }

  put(bucket: string, table: string, id: string, data: Row) {
    this.data(bucket, [{ op: 'PUT', object_type: table, object_id: id, data: JSON.stringify(data) }]);
  }

  remove(bucket: string, table: string, id: string) {
    this.data(bucket, [{ op: 'REMOVE', object_type: table, object_id: id }]);
  }

  data(bucket: string, ops: Row[]) {
    this.send({
      data: { bucket, data: ops.map((op) => ({ op_id: String(++this.#opId), checksum: 0, ...op })) }
    });
  }

  keepalive(tokenExpiresIn: number) {
    this.send({ token_expires_in: tokenExpiresIn });
  }

  complete() {
    this.send({ checkpoint_complete: { last_op_id: String(this.#opId + 10) } });
  }

  /** Sends a checkpoint with the given rows in one bucket, followed by a completion line. */
  sync(bucket: string, table: string, rows: Record<string, Row>, options?: { writeCheckpoint?: string }) {
    this.checkpoint([bucket], options);
    for (const [id, row] of Object.entries(rows)) this.put(bucket, table, id, row);
    this.complete();
  }
}

const test = baseTest
  .extend('service', () => new FakeService())
  .extend(
    'client',
    ({ service }) =>
      new PowerSyncClient({
        endpoint: 'http://localhost:8080',
        getToken: () => 'token',
        fetch: service.fetch,
        retryDelayMs: 1
      })
  )
  .extend('acquireStreams', ({ client }, { onCleanup }) => {
    const leases: StreamLease[] = [];
    onCleanup(() => leases.forEach((lease) => lease.release()));
    return (streams: readonly StreamSubscription[], options: StreamLeaseOptions = {}): StreamLease => {
      const lease = client.acquireStreams(streams, options);
      leases.push(lease);
      return lease;
    };
  })
  .extend('listen', ({ client }, { onCleanup }) => {
    const removers: (() => void)[] = [];
    onCleanup(() => removers.forEach((remove) => remove()));
    /** Listens on a table, collecting all reported changes. */
    return (table: string, options: Omit<TableListener, 'onChanges'> = {}) => {
      const changes: TableChanges[] = [];
      const remove = client.listen(table, { ...options, onChanges: (c) => changes.push(c) });
      removers.push(remove);
      return { changes, remove };
    };
  });

function streamNames(request: Record<string, any>) {
  return request.streams.subscriptions.map((s: { stream: string }) => s.stream);
}

test('syncs rows of its table once a checkpoint completes', async ({ client, service }) => {
  const lease = client.acquireStreams([{ name: 'tasks', parameters: { board: 'work' } }]);
  const didSync = lease.waitForSync();

  await service.waitForRequest(1);
  expect(service.lastRequest.streams).toEqual({
    include_defaults: false,
    subscriptions: [{ stream: 'tasks', parameters: { board: 'work' }, override_priority: null }]
  });

  service.checkpoint(['a']);
  service.put('a', 'tasks', '1', { title: 'first' });
  service.put('a', 'unrelated_table', '1', { title: 'ignored' });
  expect(client.tableSnapshot('tasks')).toHaveLength(0);

  service.complete();
  await didSync;
  expect([...client.tableSnapshot('tasks')]).toStrictEqual([['1', { title: 'first' }]]);
  expect(client.status.state).toStrictEqual('ready');

  lease.release();
  expect(service.aborted).toBe(true);
  expect(client.status.state).toBe('idle');
});

test('shares one connection, requesting the union of streams', async ({ client, service, acquireStreams, listen }) => {
  const first = acquireStreams([{ name: 'tasks' }]);
  const second = acquireStreams([{ name: 'lists' }]);
  const ready = Promise.all([first.waitForSync(), second.waitForSync()]);

  await service.waitForRequest(1);
  expect(streamNames(service.lastRequest)).toEqual(['tasks', 'lists']);
  service.checkpoint(['a', 'b']);
  service.put('a', 'tasks', '1', { title: 'task' });
  service.put('b', 'lists', '1', { title: 'list' });
  service.complete();
  await ready;
  expect(client.tableSnapshot('tasks').get('1')).toStrictEqual({ title: 'task' });
  expect(client.tableSnapshot('lists').get('1')).toStrictEqual({ title: 'list' });

  // A new listener on an already-synced table starts with the cached rows.
  const { changes } = listen('tasks');
  expect(changes).toStrictEqual([new Map([['1', { title: 'task' }]])]);

  // Releasing a lease restarts with the remaining streams, resuming buckets.
  second.release();
  await service.waitForRequest(2);
  expect(streamNames(service.lastRequest)).toEqual(['tasks']);
  expect(service.lastRequest.buckets).toEqual([
    { name: 'a', after: '1' },
    { name: 'b', after: '2' }
  ]);
});

test('reports rows from streams requested by other leases', async ({ client, service, acquireStreams, listen }) => {
  const lease = acquireStreams([{ name: 'everything' }]);
  const { changes } = listen('tasks');
  expect(changes).toStrictEqual([new Map()]);
  const ready = lease.waitForSync();

  await service.waitForRequest(1);
  service.sync('a', 'tasks', { '1': { title: 'from another stream' } });
  await ready;
  expect(changes.at(-1)).toStrictEqual(new Map([['1', { title: 'from another stream' }]]));

  service.checkpoint(['a']);
  service.remove('a', 'tasks', '1');
  service.complete();
  await vi.waitFor(() => expect(changes.at(-1)).toStrictEqual(new Map([['1', null]])));
  expect(client.tableSnapshot('tasks').size).toBe(0);
});

test('keeps listeners syncing without leases', async ({ client, service, listen }) => {
  listen('tasks');
  await service.waitForRequest(1);
  expect(service.lastRequest.streams.subscriptions).toEqual([]);
  service.sync('a', 'tasks', { '1': { title: 'default stream' } });
  await vi.waitFor(() => expect(client.status.state).toBe('ready'));
});

test('restarts when acquiring new streams on a running connection', async ({ service, acquireStreams }) => {
  const initial = acquireStreams([{ name: 'tasks' }]);
  const ready = initial.waitForSync();
  await service.waitForRequest(1);
  service.sync('a', 'tasks', { '1': { title: 'task' } });
  await ready;

  // Acquiring an already-requested stream does not restart, and is synced already.
  await acquireStreams([{ name: 'tasks' }]).waitForSync();
  await new Promise((r) => setTimeout(r, 10));
  expect(service.requests).toHaveLength(1);

  // Parameter order is irrelevant when comparing streams.
  const board = acquireStreams([{ name: 'board', parameters: { board: 'work', archived: false } }]);
  const same = acquireStreams([{ name: 'board', parameters: { archived: false, board: 'work' } }]);
  let synced = false;
  const boardSynced = Promise.all([board.waitForSync(), same.waitForSync()]).then(() => (synced = true));
  await service.waitForRequest(2);
  expect(streamNames(service.lastRequest)).toEqual(['tasks', 'board']);
  await new Promise((r) => setTimeout(r, 10));
  expect(synced).toBe(false);

  service.sync('b', 'tasks', { '2': { title: 'on board', board: 'work' } });
  await boardSynced;

  board.release();
  same.release();
  await service.waitForRequest(3);
  expect(streamNames(service.lastRequest)).toEqual(['tasks']);
});

test('confirms writes once the requested checkpoint is applied', async ({ client, service, acquireStreams }) => {
  const ready = acquireStreams([{ name: 'tasks' }]).waitForSync();
  await service.waitForRequest(1);
  service.sync('a', 'tasks', { '1': { title: 'before' } });
  await ready;

  let confirmed = false;
  const confirmation = client.confirmWrites().then(() => (confirmed = true));
  await vi.waitFor(() => expect(service.checkpointRequests).toHaveLength(1));
  expect(service.checkpointRequests[0]).toMatchObject({ checkpoint_request_id: '1' });

  // A checkpoint without the write checkpoint is not applied.
  service.sync('a', 'tasks', { '1': { title: 'stale' } });
  await new Promise((r) => setTimeout(r, 10));
  expect(confirmed).toBe(false);
  expect(client.tableSnapshot('tasks').get('1')).toStrictEqual({ title: 'before' });

  service.sync('a', 'tasks', { '1': { title: 'after' } }, { writeCheckpoint: '1' });
  await confirmation;
  expect(client.tableSnapshot('tasks').get('1')).toStrictEqual({ title: 'after' });
});

test('confirms writes if the checkpoint is synced before the checkpoint request responds', async ({
  client,
  service,
  acquireStreams
}) => {
  const ready = acquireStreams([{ name: 'tasks' }]).waitForSync();
  await service.waitForRequest(1);
  service.sync('a', 'tasks', { '1': { title: 'before' } });
  await ready;

  service.beforeCheckpointResponse = async () => {
    service.sync('a', 'tasks', { '1': { title: 'after' } }, { writeCheckpoint: '1' });
    await vi.waitFor(() => expect(client.tableSnapshot('tasks').get('1')).toStrictEqual({ title: 'after' }));
  };

  // There is no further checkpoint, so this relies on re-checking the last one.
  await client.confirmWrites();
});

test('rejects confirmWrites when not syncing', async ({ client }) => {
  await expect(client.confirmWrites()).rejects.toThrow('not syncing');
});

test('resumes buckets after reconnecting and handles bucket resets', async ({ client, service, acquireStreams }) => {
  const ready = acquireStreams([{ name: 'tasks' }]).waitForSync();
  await service.waitForRequest(1);
  service.sync('a', 'tasks', { '1': { title: 'one' }, '2': { title: 'two' } });
  await ready;

  service.close();
  await service.waitForRequest(2);
  expect(service.lastRequest.buckets).toEqual([{ name: 'a', after: '2' }]);

  // Re-sending an operation id that was already seen resets bucket state, re-downloading from scratch.
  service.checkpoint(['a']);
  service.data('a', [{ op: 'PUT', object_type: 'tasks', object_id: '1', data: '{}', op_id: '1' }]);
  await service.waitForRequest(3);
  expect(service.lastRequest.buckets).toEqual([]);

  // Row 2 is no longer part of the bucket, so it should be removed.
  service.sync('a', 'tasks', { '1': { title: 'one' } });
  await vi.waitFor(() => expect(client.tableSnapshot('tasks').size).toBe(1));
  expect(client.tableSnapshot('tasks').get('1')).toStrictEqual({ title: 'one' });
});

test('reports stream errors to the affected leases', async ({ service, acquireStreams }) => {
  const errors: StreamError[] = [];
  const failing = acquireStreams([{ name: 'invalid' }], { onError: (e) => errors.push(e) });
  const working = acquireStreams([{ name: 'valid' }]);
  const failed = failing.waitForSync();
  const ready = working.waitForSync();

  await service.waitForRequest(1);
  service.checkpoint([], {
    streams: [
      { name: 'invalid', is_default: false, errors: [{ subscription: 0, message: 'bad parameters' }] },
      { name: 'valid', is_default: false, errors: [] }
    ]
  });
  service.complete();

  await expect(failed).rejects.toThrow(StreamError);
  await ready;
  expect(errors).toHaveLength(1);
  expect(errors[0].stream.name).toBe('invalid');
  expect(errors[0].messages).toEqual(['bad parameters']);

  // Waiting again after the checkpoint reports the error immediately.
  await expect(failing.waitForSync()).rejects.toThrow('bad parameters');
});

test('rejects pending waits once released', async ({ service, acquireStreams }) => {
  const lease = acquireStreams([{ name: 'tasks' }]);
  const pending = lease.waitForSync();
  await service.waitForRequest(1);
  lease.release();
  await expect(pending).rejects.toThrow('PowerSync client stopped');
  await expect(lease.waitForSync()).rejects.toThrow('PowerSync client stopped');
});

test('reports connection errors to listeners and status', async () => {
  const client = new PowerSyncClient({
    endpoint: 'http://localhost',
    getToken: () => 'token',
    fetch: async () => new Response('', { status: 401 }),
    retryDelayMs: 1000
  });
  const errors: Error[] = [];
  const remove = client.listen('tasks', { onChanges: () => {}, onError: (e) => errors.push(e) });
  try {
    await vi.waitFor(() => expect(errors).toHaveLength(1));
    expect(errors[0].message).toContain('401');
    expect(client.status).toMatchObject({ state: 'retrying', error: errors[0] });
  } finally {
    remove();
  }
  expect(client.status.state).toBe('idle');
});

test('fetches a new token before it expires without interrupting the connection', async ({ service }) => {
  let tokens = 0;
  let resolveToken!: (token: string) => void;
  const getToken = vi.fn((_signal: AbortSignal) => {
    if (tokens++ == 0) return 'first';
    return new Promise<string>((resolve) => (resolveToken = resolve));
  });
  const client = new PowerSyncClient({
    endpoint: 'http://localhost:8080',
    getToken,
    fetch: service.fetch,
    retryDelayMs: 1
  });
  const lease = client.acquireStreams([{ name: 'tasks' }]);
  try {
    const ready = lease.waitForSync();
    await service.waitForRequest(1);
    service.sync('a', 'tasks', { '1': { title: 'one' } });
    await ready;

    // A keepalive with a long remaining lifetime does not refresh the token.
    service.keepalive(3600);
    await new Promise((r) => setTimeout(r, 10));
    expect(getToken).toHaveBeenCalledTimes(1);

    service.keepalive(20);
    await vi.waitFor(() => expect(getToken).toHaveBeenCalledTimes(2));
    service.keepalive(10);

    // The connection keeps syncing while the token is being fetched.
    service.sync('a', 'tasks', { '2': { title: 'two' } });
    await vi.waitFor(() => expect(client.tableSnapshot('tasks').size).toBe(2));
    expect(service.aborted).toBe(false);
    expect(getToken).toHaveBeenCalledTimes(2);

    resolveToken('second');
    await service.waitForRequest(2);
    expect(service.tokens).toEqual(['Token first', 'Token second']);
    expect(service.lastRequest.buckets).toEqual([{ name: 'a', after: '2' }]);
    expect(getToken).toHaveBeenCalledTimes(2);
  } finally {
    lease.release();
  }
});

test('reconnects after failing to refresh the token', async ({ service }) => {
  let tokens = 0;
  const errors: Error[] = [];
  const client = new PowerSyncClient({
    endpoint: 'http://localhost:8080',
    getToken: async () => {
      if (tokens++ == 1) throw new Error('token refresh failed');
      return `token ${tokens}`;
    },
    fetch: service.fetch,
    retryDelayMs: 1
  });
  const remove = client.listen('tasks', { onChanges: () => {}, onError: (e) => errors.push(e) });
  try {
    await service.waitForRequest(1);
    service.keepalive(20);
    await service.waitForRequest(2);
    expect(errors.map((e) => e.message)).toEqual(['token refresh failed']);
    expect(service.tokens).toEqual(['Token token 1', 'Token token 3']);
  } finally {
    remove();
  }
});

test('includes default streams while a lease requests them', async ({ client, service, acquireStreams }) => {
  const tasks = acquireStreams([{ name: 'tasks' }]);
  await service.waitForRequest(1);
  expect(service.lastRequest.streams.include_defaults).toBe(false);
  service.sync('a', 'tasks', {});
  await tasks.waitForSync();

  // A lease without explicit streams still waits for a checkpoint including default streams.
  const first = acquireStreams([], { includeDefaultStreams: true });
  const second = acquireStreams([], { includeDefaultStreams: true });
  let synced = false;
  const defaultsSynced = Promise.all([first.waitForSync(), second.waitForSync()]).then(() => (synced = true));
  await service.waitForRequest(2);
  expect(service.lastRequest.streams).toEqual({
    include_defaults: true,
    subscriptions: [{ stream: 'tasks', parameters: {}, override_priority: null }]
  });
  await new Promise((r) => setTimeout(r, 10));
  expect(synced).toBe(false);

  service.sync('b', 'defaults', { '1': { title: 'default' } });
  await defaultsSynced;
  expect(client.tableSnapshot('defaults').size).toBe(1);

  // Defaults stay included until the last lease requesting them is released.
  first.release();
  await new Promise((r) => setTimeout(r, 10));
  expect(service.requests).toHaveLength(2);

  second.release();
  await service.waitForRequest(3);
  expect(service.lastRequest.streams.include_defaults).toBe(false);
});
