import { describe, vi, expect, onTestFinished } from 'vitest';
import { PowerSyncConnectionOptions, SyncClientImplementation, SyncStreamConnectionMethod } from '@powersync/common';
import Logger from 'js-logger';
import { bucket, checkpoint, mockSyncServiceTest, nextStatus, stream, TestConnector } from './utils';

Logger.useDefaults({ defaultLevel: Logger.WARN });

describe('Sync streams', () => {
  const defaultOptions = {
    clientImplementation: SyncClientImplementation.RUST,
    connectionMethod: SyncStreamConnectionMethod.HTTP
  } satisfies PowerSyncConnectionOptions;

  mockSyncServiceTest('can disable default streams', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    await database.connect(new TestConnector(), {
      includeDefaultStreams: false,
      ...defaultOptions
    });

    expect(syncService.connectedListeners[0]).toMatchObject({
      streams: {
        include_defaults: false,
        subscriptions: []
      }
    });
  });

  mockSyncServiceTest('subscribes with streams', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    const a = await database.syncStream('stream', { foo: 'a' }).subscribe();
    const b = await database.syncStream('stream', { foo: 'b' }).subscribe({ priority: 1 });
    onTestFinished(() => {
      a.unsubscribe();
      b.unsubscribe();
    });

    await database.connect(new TestConnector(), defaultOptions);

    expect(syncService.connectedListeners[0]).toMatchObject({
      streams: {
        include_defaults: true,
        subscriptions: [
          {
            stream: 'stream',
            parameters: { foo: 'a' },
            override_priority: null
          },
          {
            stream: 'stream',
            parameters: { foo: 'b' },
            override_priority: 1
          }
        ]
      }
    });

    let statusPromise = nextStatus(database);
    syncService.pushLine(
      checkpoint({
        last_op_id: 0,
        buckets: [
          bucket('a', 0, { priority: 3, subscriptions: [{ sub: 0 }] }),
          bucket('b', 0, { priority: 1, subscriptions: [{ sub: 1 }] })
        ],
        streams: [stream('stream', false)]
      })
    );
    console.log('waiting for status update after sending checkpoint line');
    let status = await statusPromise;
    for (const subscription of [a, b]) {
      expect(status.forStream(subscription).subscription.active).toBeTruthy();
      expect(status.forStream(subscription).subscription.lastSyncedAt).toBeNull();
      expect(status.forStream(subscription).subscription.hasExplicitSubscription).toBeTruthy();
    }

    statusPromise = nextStatus(database);
    syncService.pushLine({ partial_checkpoint_complete: { last_op_id: '0', priority: 1 } });
    console.log('waiting for status update after sending partial checkpoint complete');
    status = await statusPromise;
    expect(status.forStream(a).subscription.lastSyncedAt).toBeNull();
    expect(status.forStream(b).subscription.lastSyncedAt).not.toBeNull();
    console.log('waiting for b.waitForFirstSync()');
    await b.waitForFirstSync();

    syncService.pushLine({ checkpoint_complete: { last_op_id: '0' } });
    console.log('waiting for a.waitForFirstSync() after sending checkpoint_complete line');
    await a.waitForFirstSync();
  });

  mockSyncServiceTest('reports default streams', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    await database.connect(new TestConnector(), defaultOptions);

    let statusPromise = nextStatus(database);
    syncService.pushLine(
      checkpoint({
        last_op_id: 0,
        buckets: [],
        streams: [stream('default_stream', true)]
      })
    );
    let status = await statusPromise;

    expect(status.syncStreams).toHaveLength(1);
    expect(status.syncStreams[0]).toMatchObject({
      subscription: {
        name: 'default_stream',
        parameters: null,
        isDefault: true,
        hasExplicitSubscription: false
      }
    });
  });

  mockSyncServiceTest('changes subscriptions dynamically', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    await database.connect(new TestConnector(), defaultOptions);

    syncService.pushLine(
      checkpoint({
        last_op_id: 0,
        buckets: []
      })
    );
    const subscription = await database.syncStream('a').subscribe();

    await vi.waitFor(() =>
      expect(syncService.connectedListeners[0]).toMatchObject({
        streams: {
          include_defaults: true,
          subscriptions: [
            {
              stream: 'a',
              parameters: null,
              override_priority: null
            }
          ]
        }
      })
    );

    // Given that the subscription has a TTL, dropping the handle should not re-subscribe.
    subscription.unsubscribe();
    await new Promise((r) => setTimeout(r, 100));
    expect(syncService.connectedListeners[0].streams.subscriptions).toHaveLength(1);
  });

  mockSyncServiceTest('subscriptions update while offline', async ({ syncService }) => {
    const database = await syncService.createDatabase();

    let statusPromise = nextStatus(database);
    const subscription = await database.syncStream('foo').subscribe();
    let status = await statusPromise;
    expect(status.forStream(subscription)).not.toBeNull();
  });

  mockSyncServiceTest('unsubscribing multiple times has no effect', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    const a = await database.syncStream('a').subscribe();
    const aAgain = await database.syncStream('a').subscribe();
    a.unsubscribe();
    a.unsubscribe();

    // Pretend the streams are expired - they should still be requested because the core extension extends the lifetime
    // of streams currently referenced before connecting.
    await database.execute('UPDATE ps_stream_subscriptions SET expires_at = unixepoch() - 1000');
    await database.connect(new TestConnector(), defaultOptions);

    expect(syncService.connectedListeners[0]).toMatchObject({
      streams: {
        include_defaults: true,
        subscriptions: [{}]
      }
    });
    aAgain.unsubscribe();
  });

  mockSyncServiceTest('unsubscribeAll', async ({ syncService }) => {
    const database = await syncService.createDatabase();
    const a = await database.syncStream('a').subscribe();
    database.syncStream('a').unsubscribeAll();

    await database.connect(new TestConnector(), defaultOptions);
    expect(syncService.connectedListeners[0]).toMatchObject({
      streams: {
        include_defaults: true,
        subscriptions: []
      }
    });
    a.unsubscribe();
  });
});
