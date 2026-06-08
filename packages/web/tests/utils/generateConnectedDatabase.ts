import {
  DatabaseSource,
  PowerSyncLogger,
  SQLOpenFactory,
  Schema,
  SyncStreamConnectionMethod,
  Table,
  column
} from '@powersync/common';
import { v4 as uuid, v4 } from 'uuid';
import { onTestFinished, vi } from 'vitest';
import { MockedStreamPowerSync, MockRemote, TestConnector } from './MockStreamOpenFactory.js';
import { defaultLoggerConfig } from './logger.js';
import { PowerSyncDatabase, WebPowerSyncDatabaseOptions, WebSQLFlags, WebSQLOpenFactoryOptions } from '@powersync/web';

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

export type ConnectedDatabaseUtils = UnwrapPromise<ReturnType<typeof generateConnectedDatabase>>;
export type GenerateConnectedDatabaseOptions = {
  flags?: WebSQLFlags;
  schema?: Schema;
  logger?: PowerSyncLogger;
  factory?: SQLOpenFactory;
};

export type ConnectedDBGenerator = typeof generateConnectedDatabase;

export function generateDefaultOptions(options: GenerateConnectedDatabaseOptions): WebPowerSyncDatabaseOptions {
  const source: DatabaseSource<WebSQLOpenFactoryOptions> = options.factory
    ? { factory: options.factory }
    : {
        database: {
          dbFilename: `${v4()}.db`,
          flags: {
            enableMultiTabs: false,
            useWebWorker: true,
            ...options.flags
          }
        }
      };

  return {
    ...source,
    logger: options.logger,
    schema:
      options.schema ??
      new Schema({
        users: new Table({ name: column.text })
      })
  };
}

export async function generateConnectedDatabase(options?: GenerateConnectedDatabaseOptions) {
  const resolvedOptions = generateDefaultOptions(options ?? {});

  /**
   * Very basic implementation of a listener pattern.
   * Required since we cannot extend multiple classes.
   */
  const callbacks: Map<string, () => void> = new Map();
  const connector = new TestConnector();
  const uploadSpy = vi.spyOn(connector, 'uploadData');
  const remote = new MockRemote(connector, defaultLoggerConfig.logger, () => callbacks.forEach((c) => c()));

  function openPowerSyncDatabase(): PowerSyncDatabase {
    return new MockedStreamPowerSync(resolvedOptions, remote);
  }

  const openAnother = openPowerSyncDatabase;
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

    const connectedPromise = powersync.connect(connector, { connectionMethod: SyncStreamConnectionMethod.HTTP });

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
    powersync,
    remote,
    uploadSpy,
    waitForStream,
    openAnother
  };
}
