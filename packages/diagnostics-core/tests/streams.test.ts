import { describe, expect, it } from 'vitest';

import type { BucketState, QueryResult } from '../src/shapes';
import {
  collectStreamStats,
  parseStreamBucketName,
  parseSubscriptionRows,
  readStoredSubscriptions,
  streamNameFromBucket,
  subscriptionKey
} from '../src/streams';
import type { OplogStats } from '../src/tables';

const bucket = (name: string, overrides: Partial<BucketState> = {}): BucketState => ({
  name,
  downloadedOperations: 0,
  totalOperations: null,
  downloadedSize: null,
  lastOp: null,
  downloading: false,
  ...overrides
});

const stats = (name: string, overrides: Partial<OplogStats> = {}): OplogStats => ({
  name,
  rowCount: 0,
  operationCount: 0,
  size: 0,
  ...overrides
});

describe('parseStreamBucketName', () => {
  it('reads the stream and its parameter values', () => {
    expect(parseStreamBucketName('8#lists_by_name|0["renew"]')).toEqual({
      stream: 'lists_by_name',
      parameters: ['renew']
    });
    expect(parseStreamBucketName('todos|0')).toEqual({ stream: 'todos', parameters: [] });
    expect(parseStreamBucketName('todos|0[not json')).toEqual({ stream: 'todos', parameters: [] });
  });
});

describe('streamNameFromBucket', () => {
  it('reads the stream name out of a stream bucket, with or without a bucket version', () => {
    expect(streamNameFromBucket('todos|0["list-1"]')).toBe('todos');
    expect(streamNameFromBucket('7#todos|0["list-1"]')).toBe('todos');
    expect(streamNameFromBucket('todos|0')).toBe('todos');
  });

  it('has no stream for a legacy Sync Rules bucket or a nameless one', () => {
    expect(streamNameFromBucket('by_user["u1"]')).toBeNull();
    expect(streamNameFromBucket('global')).toBeNull();
    expect(streamNameFromBucket('|0[]')).toBeNull();
    expect(streamNameFromBucket('7#|0[]')).toBeNull();
  });
});

describe('collectStreamStats', () => {
  it('adds up every bucket a stream produced, whatever its parameters', () => {
    const collected = collectStreamStats(
      [
        stats('todos|0["a"]', { rowCount: 3, operationCount: 12, size: 300 }),
        stats('todos|0["b"]', { rowCount: 2, operationCount: 4, size: 200 }),
        stats('lists|0[]', { rowCount: 1, operationCount: 1, size: 50 })
      ],
      [
        bucket('todos|0["a"]', { downloadedOperations: 12, totalOperations: 12, downloading: true }),
        bucket('todos|0["b"]', { downloadedOperations: 4, totalOperations: 6 }),
        bucket('lists|0[]', { downloadedOperations: 1, totalOperations: 1 })
      ]
    );

    expect(collected.get('todos')).toEqual({
      rowCount: 5,
      operationCount: 16,
      size: 500,
      bucketCount: 2,
      downloadedOperations: 16,
      totalOperations: 18,
      isDownloading: true
    });
    expect(collected.get('lists')?.isDownloading).toBe(false);
  });

  it('leaves out buckets that belong to no stream', () => {
    const collected = collectStreamStats([stats('by_user["u1"]', { rowCount: 4 })], [bucket('by_user["u1"]')]);

    expect([...collected.keys()]).toEqual([]);
  });

  it('reports an unknown total when no bucket carries one', () => {
    const collected = collectStreamStats(
      [stats('todos|0[]', { rowCount: 1, operationCount: 2 })],
      [bucket('todos|0[]', { downloadedOperations: 2 })]
    );

    expect(collected.get('todos')?.totalOperations).toBeNull();
    expect(collected.get('todos')?.downloadedOperations).toBe(2);
  });

  it('counts a bucket that has downloaded nothing yet', () => {
    const collected = collectStreamStats([], [bucket('todos|0[]')]);

    expect(collected.get('todos')).toEqual({
      rowCount: 0,
      operationCount: 0,
      size: 0,
      bucketCount: 0,
      downloadedOperations: 0,
      totalOperations: null,
      isDownloading: false
    });
  });
});

describe('subscriptionKey', () => {
  it('identifies a subscription by its stream and parameters, ignoring key order', () => {
    expect(subscriptionKey('todos', { list: 'a', org: 'b' })).toBe(subscriptionKey('todos', { org: 'b', list: 'a' }));
    expect(subscriptionKey('todos', null)).toBe(subscriptionKey('todos', undefined));
  });

  it('separates the same stream subscribed with different parameters', () => {
    expect(subscriptionKey('todos', { list: 'a' })).not.toBe(subscriptionKey('todos', { list: 'b' }));
    expect(subscriptionKey('todos', {})).not.toBe(subscriptionKey('lists', {}));
  });
});

describe('parseSubscriptionRows', () => {
  it('reads the stream and its parameters off each row', () => {
    const rows = [
      { stream_name: 'lists_by_name', local_params: '{"list_name":"warmup"}' },
      { stream_name: 'todos', local_params: 'null' }
    ];

    expect(parseSubscriptionRows(rows)).toEqual([
      { name: 'lists_by_name', params: { list_name: 'warmup' } },
      { name: 'todos', params: null }
    ]);
  });

  it('skips rows that are not subscriptions and parameters that are not an object', () => {
    const rows = [
      { stream_name: 'a', local_params: '[1,2]' },
      { stream_name: 'b', local_params: '{not json' },
      { other: 1 }
    ];

    expect(parseSubscriptionRows(rows)).toEqual([
      { name: 'a', params: null },
      { name: 'b', params: null }
    ]);
  });
});

describe('readStoredSubscriptions', () => {
  const result = (rows: Record<string, unknown>[]): QueryResult => ({
    columns: Object.keys(rows[0] ?? {}),
    rows,
    rowCount: rows.length
  });

  it('reads the core table, converting its microsecond timestamps and numeric flags', async () => {
    const client = {
      runQuery: async () =>
        result([
          {
            stream_name: 'lists_by_name',
            local_params: '{"list_name":"renew"}',
            ttl: '3600',
            expires_at: 1_700_000_000_000_000,
            last_synced_at: null,
            active: 1,
            is_default: '0'
          }
        ])
    };

    const stored = await readStoredSubscriptions(client);
    const key = subscriptionKey('lists_by_name', { list_name: 'renew' });

    expect([...stored.keys()]).toEqual([key]);
    expect(stored.get(key)).toEqual({
      key,
      name: 'lists_by_name',
      ttl: 3600,
      expiresAt: 1_700_000_000_000,
      lastSyncedAt: null,
      isActive: true,
      isDefault: false
    });
  });

  it('skips rows with unreadable numbers rather than reporting them wrong', async () => {
    const client = {
      runQuery: async () =>
        result([
          {
            stream_name: 'a',
            local_params: 'null',
            ttl: 'soon',
            expires_at: null,
            last_synced_at: null,
            active: 1,
            is_default: 0
          },
          {
            stream_name: 'b',
            local_params: 'null',
            ttl: null,
            expires_at: null,
            last_synced_at: null,
            active: 0,
            is_default: 1
          }
        ])
    };

    const stored = await readStoredSubscriptions(client);

    expect([...stored.values()].map((subscription) => subscription.name)).toEqual(['b']);
    expect(stored.get(subscriptionKey('b', null))?.isDefault).toBe(true);
  });
});
