import _ from 'lodash';
import Logger from 'js-logger';
import { beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuid } from 'uuid';
import { AbstractPowerSyncDatabase, Schema, SyncStatusOptions, TableV2, column } from '@powersync/common';
import { MockRemote, MockStreamOpenFactory, TestConnector } from './utils/MockStreamOpenFactory';

export async function waitForConnectionStatus(
  db: AbstractPowerSyncDatabase,
  statusCheck: SyncStatusOptions = { connected: true }
) {
  await new Promise<void>((resolve) => {
    if (db.connected) {
      resolve();
    }
    const l = db.registerListener({
      statusUpdated: (status) => {
        if (_.every(statusCheck, (value, key) => _.isEqual(status[key as keyof SyncStatusOptions], value))) {
          resolve();
          l?.();
        }
      }
    });
  });
}

export async function generateConnectedDatabase({ useWebWorker } = { useWebWorker: true }) {
  /**
   * Very basic implementation of a listener pattern.
   * Required since we cannot extend multiple classes.
   */
  const callbacks: Map<string, () => void> = new Map();
  const remote = new MockRemote(new TestConnector(), () => callbacks.forEach((c) => c()));

  const users = new TableV2({
    name: column.text
  });

  const schema = new Schema({
    users
  });

  const factory = new MockStreamOpenFactory(
    {
      dbFilename: 'test-stream-connection.db',
      flags: {
        enableMultiTabs: false,
        useWebWorker
      },
      schema
    },
    remote
  );
  const powersync = factory.getInstance();

  const waitForStream = () =>
    new Promise<void>((resolve) => {
      const id = uuid();
      callbacks.set(id, () => {
        resolve();
        callbacks.delete(id);
      });
    });

  const streamOpened = waitForStream();

  const connectedPromise = powersync.connect(new TestConnector());

  await streamOpened;

  remote.streamController?.enqueue(new TextEncoder().encode('{"token_expires_in":3426}\n'));

  // Wait for connected to be true
  await connectedPromise;

  return {
    factory,
    powersync,
    remote,
    waitForStream
  };
}

describe('Stream test', () => {
  describe('With Web Worker', () => {
    beforeAll(() => Logger.useDefaults());

    it('PowerSync reconnect on closed stream', async () => {
      const { powersync, waitForStream, remote } = await generateConnectedDatabase();
      expect(powersync.connected).toBe(true);

      // Close the stream
      const newStream = waitForStream();
      remote.streamController?.close();

      // A new stream should be requested
      await newStream;

      await powersync.disconnectAndClear();
      await powersync.close();

      // Do the same as the above for the case where there is no web worker
      const resultWithoutWebWorker = await generateConnectedDatabase({ useWebWorker: false });
      expect(resultWithoutWebWorker.powersync.connected).toBe(true);

      const newStream2 = resultWithoutWebWorker.waitForStream();
      resultWithoutWebWorker.remote.streamController?.close();
      await newStream2;
      await resultWithoutWebWorker.powersync.disconnectAndClear();
      await resultWithoutWebWorker.powersync.close();
    });

    it('PowerSync reconnect multiple connect calls', async () => {
      // This initially performs a connect call
      const { powersync, waitForStream } = await generateConnectedDatabase();
      expect(powersync.connected).toBe(true);

      // Call connect again, a new stream should be requested
      const newStream = waitForStream();
      powersync.connect(new TestConnector());

      // A new stream should be requested
      await newStream;

      await powersync.disconnectAndClear();
      await powersync.close();

      // Do the same as the above for the case where there is no web worker
      const resultWithoutWebWorker = await generateConnectedDatabase({ useWebWorker: false });
      expect(resultWithoutWebWorker.powersync.connected).toBe(true);

      const newStream2 = resultWithoutWebWorker.waitForStream();
      resultWithoutWebWorker.powersync.connect(new TestConnector());
      await newStream2;
      await resultWithoutWebWorker.powersync.disconnectAndClear();
      await resultWithoutWebWorker.powersync.close();
    });
  });
});
