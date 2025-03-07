import { Schema, Table, column } from '@powersync/common';
import { WebPowerSyncOpenFactoryOptions } from '@powersync/web';
import { v4 as uuid, v4 } from 'uuid';
import { onTestFinished, vi } from 'vitest';
import { MockRemote, MockStreamOpenFactory, TestConnector } from './MockStreamOpenFactory';

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

export type ConnectedDatabaseUtils = UnwrapPromise<ReturnType<typeof generateConnectedDatabase>>;
export type GenerateConnectedDatabaseOptions = {
  powerSyncOptions: Partial<WebPowerSyncOpenFactoryOptions>;
};

export type ConnectedDBGenerator = typeof generateConnectedDatabase;

export const DEFAULT_CONNECTED_POWERSYNC_OPTIONS = generateDefaultOptions();

function generateDefaultOptions() {
  return {
    powerSyncOptions: {
      dbFilename: `${v4()}.db`,
      flags: {
        enableMultiTabs: false,
        useWebWorker: true
      },
      // Makes tests faster
      crudUploadThrottleMs: 0,
      schema: new Schema({
        users: new Table({ name: column.text })
      })
    }
  };
}

export async function generateConnectedDatabase(options: GenerateConnectedDatabaseOptions = generateDefaultOptions()) {
  const { powerSyncOptions } = options;
  const { powerSyncOptions: defaultPowerSyncOptions } = DEFAULT_CONNECTED_POWERSYNC_OPTIONS;
  /**
   * Very basic implementation of a listener pattern.
   * Required since we cannot extend multiple classes.
   */
  const callbacks: Map<string, () => void> = new Map();
  const connector = new TestConnector();
  const uploadSpy = vi.spyOn(connector, 'uploadData');
  const remote = new MockRemote(connector, () => callbacks.forEach((c) => c()));

  const factory = new MockStreamOpenFactory(
    {
      ...defaultPowerSyncOptions,
      ...powerSyncOptions,
      flags: {
        ...(defaultPowerSyncOptions.flags ?? {}),
        ...(powerSyncOptions.flags ?? {})
      }
    },
    remote
  );

  const openAnother = factory.getInstance.bind(factory);
  const powersync = openAnother();

  const waitForStream = () =>
    new Promise<void>((resolve) => {
      const id = uuid();
      callbacks.set(id, () => {
        resolve();
        callbacks.delete(id);
      });
    });

  const connect = async () => {
    const streamOpened = waitForStream();

    const connectedPromise = powersync.connect(connector);

    await streamOpened;

    remote.enqueueLine({ token_expires_in: 3426 });

    // Wait for connected to be true
    await connectedPromise;
  };

  await connect();

  onTestFinished(async () => {
    if (powersync.closed) {
      return;
    }
    await powersync.disconnectAndClear();
    await powersync.close();
  });

  return {
    connector,
    connect,
    factory,
    powersync,
    remote,
    uploadSpy,
    waitForStream,
    openAnother
  };
}
