import { CommonPowerSyncDatabase } from '@powersync/common';
import { Kysely, sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { wrapPowerSyncWithKysely } from '../../src/sqlite/db.js';
import { getPowerSyncDb } from '../setup/db.js';
import { Database } from '../setup/types.js';

const WRITE_TIMEOUT_MS = 3000;

/**
 * Resolves with the write result, or rejects if the write does not finish in time, which means the
 * PowerSync write lock is still held by a transaction that was never released.
 */
function writeWithTimeout(db: CommonPowerSyncDatabase) {
  return Promise.race([
    db.execute('INSERT INTO users (id, name) VALUES (uuid(), ?)', ['after']),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`write did not complete within ${WRITE_TIMEOUT_MS}ms, the write lock is still held`)),
        WRITE_TIMEOUT_MS
      )
    )
  ]);
}

/**
 * Regression tests for https://github.com/powersync-ja/powersync-js/issues/1102.
 *
 * The connection parks a PowerSync `writeTransaction` callback until Kysely commits or rolls back.
 * If the COMMIT or ROLLBACK statement itself throws, the parked callback must still be released,
 * otherwise the write lock is held forever and every later write hangs.
 */
describe('transaction lock release', () => {
  let powerSyncDb: CommonPowerSyncDatabase;
  let db: Kysely<Database>;

  beforeEach(() => {
    powerSyncDb = getPowerSyncDb();
    db = wrapPowerSyncWithKysely<Database>(powerSyncDb);
  });

  afterEach(async () => {
    await powerSyncDb.disconnectAndClear();
    await powerSyncDb.close();
  });

  it('should release the write lock when ROLLBACK fails', async () => {
    // Ending the SQLite transaction by hand and then throwing makes Kysely's ROLLBACK fail with
    // "cannot rollback - no transaction is active".
    await expect(
      db.transaction().execute(async (trx) => {
        await sql`ROLLBACK`.execute(trx);
        throw new Error('callback failed');
      })
    ).rejects.toThrow();

    await expect(writeWithTimeout(powerSyncDb)).resolves.toBeDefined();
  });

  it('should release the write lock when COMMIT fails', async () => {
    await expect(
      db.transaction().execute(async (trx) => {
        await sql`COMMIT`.execute(trx);
      })
    ).rejects.toThrow();

    await expect(writeWithTimeout(powerSyncDb)).resolves.toBeDefined();
  });
});
