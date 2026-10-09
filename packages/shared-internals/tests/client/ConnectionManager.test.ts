import {
  BaseObserver,
  LogLevels,
  PowerSyncBackendConnector,
  SyncStatus,
  SyncStreamConnectionMethod,
  createConsoleLogger
} from '@powersync/common';
import { describe, expect, test } from 'vitest';
import { ConnectionManager, InternalSubscriptionAdapter } from '../../src/client/ConnectionManager.js';
import { ResolvedSyncOptions } from '../../src/client/sync/options.js';
import {
  StreamingSyncImplementation,
  StreamingSyncImplementationListener,
  SubscribedStream
} from '../../src/client/sync/stream/AbstractStreamingSyncImplementation.js';

const names = (subscriptions: SubscribedStream[]) => subscriptions.map((s) => s.name);

class MockStreamingSyncImplementation
  extends BaseObserver<StreamingSyncImplementationListener>
  implements StreamingSyncImplementation
{
  isConnected = false;
  isReady = false;
  disconnectCalls = 0;
  disconnectError: Error | null = null;
  readonly receivedUpdates: SubscribedStream[][] = [];

  constructor(
    readonly snapshot: SubscribedStream[],
    private duringReady: (() => void | Promise<void>) | null = null
  ) {
    super();
  }

  // What this implementation would request from the service: the set connect() created it with,
  // unless a later update replaced it.
  get effectiveSubscriptions(): SubscribedStream[] {
    return this.receivedUpdates.at(-1) ?? this.snapshot;
  }

  async connect(_options: ResolvedSyncOptions) {
    this.isConnected = true;
  }

  async disconnect() {
    this.disconnectCalls++;
    this.isConnected = false;
    if (this.disconnectError) {
      throw this.disconnectError;
    }
  }

  async getWriteCheckpoint() {
    return '1';
  }

  triggerCrudUpload() {}

  async waitForReady() {
    await this.duringReady?.();
    this.duringReady = null;
    this.isReady = true;
  }

  async waitUntilStatusMatches(_predicate: (status: SyncStatus) => boolean) {}

  updateSubscriptions(subscriptions: SubscribedStream[]) {
    if (!this.isReady) {
      // Modelled on SharedWebStreamingSyncImplementation, which discards updates while its Comlink
      // port is unresolved.
      return;
    }
    this.receivedUpdates.push(subscriptions);
  }

  markConnectionMayHaveChanged() {}

  async dispose() {
    super.dispose();
  }
}

const connector: PowerSyncBackendConnector = {
  fetchCredentials: async () => null,
  uploadData: async () => {}
};

const adapter: InternalSubscriptionAdapter = {
  firstStatusMatching: async () => {},
  resolveOfflineSyncStatus: async () => {},
  rustSubscriptionsCommand: async () => {}
};

// The connect window: after connect() has read the current subscriptions, and before there is a
// ready implementation to send updates to. duringCreate and duringReady run inside it.
function managerWithCreateHook() {
  const syncs: MockStreamingSyncImplementation[] = [];
  let duringCreate: (() => void | Promise<void>) | null = null;
  let duringReady: (() => void | Promise<void>) | null = null;

  const manager = new ConnectionManager({
    logger: createConsoleLogger({ minLevel: LogLevels.error }),
    defaultConnectionMethod: SyncStreamConnectionMethod.HTTP,
    createSyncImplementation: async (_connector, options) => {
      await duringCreate?.();
      const sync = new MockStreamingSyncImplementation(options.subscriptions, duringReady);
      duringReady = null;
      syncs.push(sync);
      return { sync, onDispose: () => {} };
    }
  });

  return {
    manager,
    syncs,
    duringCreate(action: () => void | Promise<void>) {
      duringCreate = async () => {
        duringCreate = null;
        await action();
      };
    },
    duringReady(action: () => void | Promise<void>) {
      duringReady = action;
    },
    get sync() {
      return syncs.at(-1)!;
    }
  };
}

describe('ConnectionManager', () => {
  describe('subscription changes inside the connect window', () => {
    test('applies an unsubscribe made inside the connect window', async () => {
      const harness = managerWithCreateHook();
      await harness.manager.stream(adapter, 'stream_a', null).subscribe();
      const b = await harness.manager.stream(adapter, 'stream_b', null).subscribe();

      harness.duringCreate(() => b.unsubscribe());
      await harness.manager.connect(connector, {}, {});

      expect(names(harness.sync.snapshot)).toEqual(['stream_a', 'stream_b']);
      expect(names(harness.sync.effectiveSubscriptions)).toEqual(['stream_a']);

      await harness.manager.disconnect();
    });

    test('applies a subscribe made inside the connect window', async () => {
      const harness = managerWithCreateHook();
      await harness.manager.stream(adapter, 'stream_a', null).subscribe();

      harness.duringCreate(() => harness.manager.stream(adapter, 'stream_b', null).subscribe());
      await harness.manager.connect(connector, {}, {});

      expect(names(harness.sync.snapshot)).toEqual(['stream_a']);
      expect(names(harness.sync.effectiveSubscriptions)).toEqual(['stream_a', 'stream_b']);

      await harness.manager.disconnect();
    });

    test('sends no update when nothing changed inside the connect window', async () => {
      const harness = managerWithCreateHook();
      await harness.manager.stream(adapter, 'stream_a', null).subscribe();

      await harness.manager.connect(connector, {}, {});

      // Not an optimisation: SharedSyncImplementation sets subscriptions on its implementation from
      // the merged cross-tab set and leaves its own connection manager's activeStreams empty, so an
      // unconditional update from here would overwrite that merged set with an empty one.
      expect(harness.sync.receivedUpdates).toEqual([]);
      expect(names(harness.sync.snapshot)).toEqual(['stream_a']);

      await harness.manager.disconnect();
    });

    test('waits for the implementation to be ready before sending the update', async () => {
      const harness = managerWithCreateHook();
      await harness.manager.stream(adapter, 'stream_a', null).subscribe();
      const b = await harness.manager.stream(adapter, 'stream_b', null).subscribe();

      // Later in the window: the implementation exists, but is still coming up, so the update it
      // receives is discarded and has to be re-sent once it is ready.
      harness.duringReady(() => b.unsubscribe());
      await harness.manager.connect(connector, {}, {});

      expect(names(harness.sync.snapshot)).toEqual(['stream_a', 'stream_b']);
      expect(names(harness.sync.effectiveSubscriptions)).toEqual(['stream_a']);

      await harness.manager.disconnect();
    });

    test('applies a change made inside the connect window of a reconnect', async () => {
      const harness = managerWithCreateHook();
      const a = await harness.manager.stream(adapter, 'stream_a', null).subscribe();
      await harness.manager.connect(connector, {}, {});

      harness.duringCreate(() => a.unsubscribe());
      await harness.manager.connect(connector, {}, {});

      expect(harness.syncs).toHaveLength(2);
      expect(names(harness.sync.snapshot)).toEqual(['stream_a']);
      expect(names(harness.sync.effectiveSubscriptions)).toEqual([]);

      await harness.manager.disconnect();
    });
  });

  describe('failed disconnect', () => {
    test('does not reuse a rejected disconnect for later disconnect and connect', async () => {
      const harness = managerWithCreateHook();
      await harness.manager.connect(connector, {}, {});
      const error = new Error('transient teardown failure');
      harness.sync.disconnectError = error;

      await expect(harness.manager.disconnect()).rejects.toBe(error);
      // performDisconnect already nulled the sync implementation, so a retry has nothing to tear down.
      await expect(harness.manager.disconnect()).resolves.toBeUndefined();
      expect(harness.syncs[0].disconnectCalls).toBe(1);

      await harness.manager.connect(connector, {}, {});
      expect(harness.syncs).toHaveLength(2);

      await harness.manager.disconnect();
    });

    test('concurrent disconnects share the in-flight rejection, then a later call retries', async () => {
      const harness = managerWithCreateHook();
      await harness.manager.connect(connector, {}, {});
      const error = new Error('transient teardown failure');
      harness.sync.disconnectError = error;

      const first = harness.manager.disconnect();
      const second = harness.manager.disconnect();

      await expect(first).rejects.toBe(error);
      await expect(second).rejects.toBe(error);

      await expect(harness.manager.disconnect()).resolves.toBeUndefined();
      expect(harness.syncs[0].disconnectCalls).toBe(1);
    });
  });
});
