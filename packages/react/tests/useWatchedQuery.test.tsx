import { cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useWatchedQuery } from '../src/hooks/watched/useWatchedQuery';
import { WatchCompatibleQuery } from '@powersync/common';
import { openPowerSync } from './utils';

const makeQuery = (db: ReturnType<typeof openPowerSync>, sql: string, params: any[]): WatchCompatibleQuery<any[]> => ({
  compile: () => ({ sql, parameters: params }),
  execute: () => db.getAll(sql, params)
});

describe('useWatchedQuery query recreation (React 19.2 useEffectEvent)', () => {
  beforeEach(() => {
    cleanup();
  });

  /**
   * Behavioral invariant guarded by the `useEffectEvent` recreation logic:
   * when the recreation effect re-runs (because `active` flips false -> true), it must build
   * the WatchedQuery from the LATEST `query`/`hookOptions`, never a stale closure of an
   * earlier render's query. This protects against future React internals / concurrent-mode
   * changes and documents the intended contract.
   */
  it('recreates the watched query with the LATEST query when active flips false -> true after the query changed', async () => {
    const db = openPowerSync();
    await db.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['keep']);
    await db.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['drop']);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
    );

    // Unfiltered query selects ALL rows, but the hook is INACTIVE so no watch is created yet.
    const unfilteredQuery = makeQuery(db, 'SELECT * FROM lists ORDER BY name', []);
    // The query is changed to a FILTERED query while STILL inactive (effect does not re-run here).
    const filteredQuery = makeQuery(db, 'SELECT * FROM lists WHERE name = ? ORDER BY name', ['keep']);

    const { result, rerender } = renderHook(
      ({ query, active }: { query: WatchCompatibleQuery<any[]>; active: boolean }) =>
        useWatchedQuery<{ id: string; name: string }>({
          query,
          powerSync: db,
          queryChanged: false,
          options: {},
          active
        }),
      {
        wrapper,
        initialProps: { query: unfilteredQuery, active: false }
      }
    );

    // Inactive: no watch, no data.
    expect(result.current.data).toEqual([]);

    // The query changes to the filtered query while STILL inactive.
    rerender({ query: filteredQuery, active: false });
    expect(result.current.data).toEqual([]);

    // Activate. The recreation effect re-runs and must build from the LATEST (filtered) query.
    rerender({ query: filteredQuery, active: true });

    await waitFor(
      () => {
        expect(result.current.error).toBeFalsy();
        expect(result.current.data.length).toEqual(1);
      },
      { timeout: 2000, interval: 100 }
    );

    expect(result.current.data.map((r) => r.name)).toEqual(['keep']);
  });

  it('recreates the watched query with the latest query in StrictMode', async () => {
    const db = openPowerSync();
    await db.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['keep']);
    await db.execute('INSERT INTO lists (id, name) VALUES (uuid(), ?)', ['drop']);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
      </React.StrictMode>
    );

    const unfilteredQuery = makeQuery(db, 'SELECT * FROM lists ORDER BY name', []);
    const filteredQuery = makeQuery(db, 'SELECT * FROM lists WHERE name = ? ORDER BY name', ['keep']);

    const { result, rerender } = renderHook(
      ({ query, active }: { query: WatchCompatibleQuery<any[]>; active: boolean }) =>
        useWatchedQuery<{ id: string; name: string }>({
          query,
          powerSync: db,
          queryChanged: false,
          options: {},
          active
        }),
      {
        wrapper,
        initialProps: { query: unfilteredQuery, active: false }
      }
    );

    rerender({ query: filteredQuery, active: false });
    rerender({ query: filteredQuery, active: true });

    await waitFor(
      () => {
        expect(result.current.error).toBeFalsy();
        expect(result.current.data.length).toEqual(1);
      },
      { timeout: 2000, interval: 100 }
    );

    expect(result.current.data.map((r) => r.name)).toEqual(['keep']);
  });
});
