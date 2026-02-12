import * as commonSdk from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { computed, ref } from 'vue';
import { createPowerSyncPlugin } from '../src/composables/powerSync';
import { useQuery } from '../src/composables/useQuery';
import { useSyncStream } from '../src/composables/useSyncStream';
import { withSetup } from './utils';

const schema = new commonSdk.Schema({
  lists: new commonSdk.Table({
    name: commonSdk.column.text
  })
});

function openPowerSync() {
  const db = new PowerSyncDatabase({
    database: { dbFilename: 'test-streams.db' },
    schema
  });

  onTestFinished(async () => {
    await (db as any).execute?.('DELETE FROM ps_stream_subscriptions').catch(() => {});
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
}

function currentStreams(db: commonSdk.AbstractPowerSyncDatabase) {
  const connections = (db as any).connectionManager as commonSdk.ConnectionManager;
  return connections.activeStreams;
}

const _testStatus = new commonSdk.SyncStatus({
  dataFlow: {
    internalStreamSubscriptions: [
      {
        name: 'a',
        parameters: null,
        progress: { total: 0, downloaded: 0 },
        active: true,
        is_default: false,
        has_explicit_subscription: true,
        expires_at: null,
        last_synced_at: 1234,
        priority: 1
      }
    ]
  }
});

describe('stream composables', () => {
  let db: commonSdk.AbstractPowerSyncDatabase;

  beforeEach(() => {
    db = openPowerSync();
    vi.clearAllMocks();
  });

  const withPowerSyncSetup = <Result>(callback: () => Result) => {
    return withSetup(callback, (app) => {
      const { install } = createPowerSyncPlugin({ database: db });
      install(app);
    });
  };

  it('useSyncStream', async () => {
    expect(currentStreams(db)).toStrictEqual([]);

    const [result, app] = withPowerSyncSetup(() => useSyncStream(ref('a'), ref({})));
    expect(result.status.value).toBeNull();

    await vi.waitFor(() => expect(result.status.value).not.toBeNull(), { timeout: 1000, interval: 100 });
    expect(currentStreams(db)).toStrictEqual([{ name: 'a', params: null }]);

    app.unmount();
    expect(currentStreams(db)).toStrictEqual([]);
  });

  it('useQuery with streams runs query without waiting', async () => {
    const [result] = withPowerSyncSetup(() => useQuery('SELECT 1', [], { streams: [{ name: 'a' }] }));

    await vi.waitFor(() => expect(result.data.value).toHaveLength(1), { timeout: 1000, interval: 100 });
  });

  it('useQuery waiting on stream', async () => {
    const [result] = withPowerSyncSetup(() =>
      useQuery('SELECT 1', [], { streams: [{ name: 'a', waitForStream: true }] })
    );

    expect(result.isLoading.value).toBe(true);

    await vi.waitFor(() => expect(currentStreams(db)).toHaveLength(1), { timeout: 1000, interval: 100 });
    expect(result.isLoading.value).toBe(true);

    (db as any).currentStatus = _testStatus;
    db.iterateListeners((l: any) => l.statusChanged?.(_testStatus));

    await vi.waitFor(() => expect(result.data.value).toHaveLength(1), { timeout: 1000, interval: 100 });
  });

  it('unsubscribes on unmount', async () => {
    const [, app] = withPowerSyncSetup(() => useQuery('SELECT 1', [], { streams: [{ name: 'a' }, { name: 'b' }] }));

    await vi.waitFor(() => expect(currentStreams(db)).toHaveLength(2), { timeout: 1000, interval: 100 });

    app.unmount();
    await vi.waitFor(() => expect(currentStreams(db)).toHaveLength(0), { timeout: 1000, interval: 100 });
  });

  it('handles stream parameter changes', async () => {
    const streamsRef = ref<{ name: string; waitForStream?: boolean }[]>([]);

    const [result] = withPowerSyncSetup(() =>
      useQuery(
        'SELECT 1',
        [],
        computed(() => ({ streams: streamsRef.value }))
      )
    );

    await vi.waitFor(() => expect(result.data.value).toHaveLength(1), { timeout: 1000, interval: 100 });

    streamsRef.value = [{ name: 'a', waitForStream: true }];
    await vi.waitFor(() => expect(currentStreams(db)).toHaveLength(1), { timeout: 1000, interval: 100 });
    expect(result.isLoading.value).toBe(true);

    streamsRef.value = [];
    await vi.waitFor(() => expect(currentStreams(db)).toHaveLength(0), { timeout: 1000, interval: 100 });
  });
});
