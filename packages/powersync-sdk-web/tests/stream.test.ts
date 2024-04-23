import _ from 'lodash';
import Logger from 'js-logger';
import { beforeAll, describe, expect, it } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  AbstractPowerSyncDatabase,
  Column,
  ColumnType,
  Schema,
  SyncStatusOptions,
  Table
} from '@journeyapps/powersync-sdk-common';
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

export async function generateConnectedDatabase() {
  /**
   * Very basic implementation of a listener pattern.
   * Required since we cannot extend multiple classes.
   */
  const callbacks: Map<string, () => void> = new Map();
  const remote = new MockRemote(new TestConnector(), () => callbacks.forEach((c) => c()));

  const factory = new MockStreamOpenFactory(
    {
      dbFilename: 'test-stream-connection.db',
      flags: {
        enableMultiTabs: false
      },
      schema: new Schema([
        new Table({
          name: 'users',
          columns: [new Column({ name: 'name', type: ColumnType.TEXT })]
        })
      ])
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
  beforeAll(() => Logger.useDefaults());

  it('PowerSync reconnect on closed stream', async () => {
    const { powersync, waitForStream, remote } = await generateConnectedDatabase();
    expect(powersync.connected).true;

    // Close the stream
    const newStream = waitForStream();
    remote.streamController?.close();

    // A new stream should be requested
    await newStream;

    await powersync.disconnectAndClear();
    await powersync.close();
  });

  it('PowerSync reconnect multiple connect calls', async () => {
    // This initially performs a connect call
    const { powersync, waitForStream } = await generateConnectedDatabase();
    expect(powersync.connected).true;

    // Call connect again, a new stream should be requested
    const newStream = waitForStream();
    powersync.connect(new TestConnector());

    // A new stream should be requested
    await newStream;

    await powersync.disconnectAndClear();
    await powersync.close();
  });
});
