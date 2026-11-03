import { CommonPowerSyncDatabase } from '@powersync/common';
import { describe, expect, it, vi } from 'vitest';
import { QueryRunner, resolveConfig } from '../src/hooks/watched/QueryRunner';
import { openPowerSync } from './utils';
import { ReadonlyQueryResult } from '../src/hooks/watched/watch-types';

describe('QueryRunner', () => {
  type Row = { name: string };

  function configFor(db: CommonPowerSyncDatabase, name: string, differential: boolean) {
    const sql = 'SELECT name FROM lists WHERE name = ?';
    const parameters = [name];
    return resolveConfig<Row>(
      db,
      { compile: () => ({ sql, parameters }), execute: () => db.getAll(sql, parameters) },
      differential ? { rowComparator: { keyBy: (r) => r.name, compareBy: (r) => r.name } } : {},
      true
    );
  }

  for (const differential of [false, true]) {
    it(`does not report stale data as settled after a parameter change (differential: ${differential})`, async () => {
      const db = await openPowerSync();
      await db.execute(`INSERT INTO lists (id, name) VALUES (uuid(), 'first'), (uuid(), 'second')`);

      const runner = new QueryRunner<Row>();
      runner.configure(configFor(db, 'first', differential));

      // Record every snapshot we're notified about, not just the ones React would render. React may batch synchronous
      // notifications, but we don't want to leak internal state at any point.
      const snapshots: ReadonlyQueryResult<Row>[] = [];
      const unsubscribe = runner.subscribe(() => snapshots.push(runner.getSnapshot()));

      const isSettledOn = (name: string) => {
        const { isLoading, isFetching, data } = runner.getSnapshot();
        return !isLoading && !isFetching && data[0]?.name == name;
      };
      await vi.waitFor(() => expect(isSettledOn('first')).toBe(true));

      const settledIndex = snapshots.length;
      runner.configure(configFor(db, 'second', differential));
      await vi.waitFor(() => expect(isSettledOn('second')).toBe(true));
      unsubscribe();

      const afterUpdate = snapshots.slice(settledIndex);
      // Every snapshot before the new data arrives must report that we're fetching.
      const firstNewData = afterUpdate.findIndex((s) => s.data[0]?.name == 'second');
      expect(firstNewData).toBeGreaterThanOrEqual(0);
      for (const snapshot of afterUpdate.slice(0, firstNewData)) {
        expect(snapshot).toMatchObject({ isFetching: true, data: [{ name: 'first' }] });
      }
    });
  }
});
