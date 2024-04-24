import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import * as SUT from '../../src/sqlite/sqlite-driver';
import { PowerSyncConnection } from '../../src/sqlite/sqlite-connection';
import { getPowerSyncDb } from '../setup/db';

describe('PowerSyncDriver', () => {
  let driver: SUT.PowerSyncDriver;
  let PowerSync: AbstractPowerSyncDatabase;

  beforeEach(() => {
    PowerSync = getPowerSyncDb();
    driver = new SUT.PowerSyncDriver({ db: PowerSync });
  });

  afterEach(async () => {
    await PowerSync.disconnectAndClear();
    await PowerSync.close();
  });

  it('should create a new connection instance when acquiring a connection', async () => {
    const connection = await driver.acquireConnection();

    expect(connection).toBeInstanceOf(PowerSyncConnection);
  });

  it('should begin a transaction on the connection', async () => {
    const connectionMock = {
      beginTransaction: vi.fn()
    } as any;

    await driver.beginTransaction(connectionMock);

    expect(connectionMock.beginTransaction).toHaveBeenCalledTimes(1);
  });

  it('should commit a transaction on the connection', async () => {
    const connectionMock = {
      commitTransaction: vi.fn()
    } as any;

    await driver.commitTransaction(connectionMock);

    expect(connectionMock.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('should rollback a transaction on the connection', async () => {
    const connectionMock = {
      rollbackTransaction: vi.fn()
    } as any;

    await driver.rollbackTransaction(connectionMock);

    expect(connectionMock.rollbackTransaction).toHaveBeenCalledTimes(1);
  });

  it('should release a connection', async () => {
    const connectionMock = {
      releaseConnection: vi.fn()
    } as any;

    await driver.releaseConnection(connectionMock);

    expect(connectionMock.releaseConnection).toHaveBeenCalledTimes(1);
  });
});
