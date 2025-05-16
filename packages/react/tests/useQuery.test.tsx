import * as commonSdk from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import pDefer from 'p-defer';
import React from 'react';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useQuery } from '../src/hooks/useQuery';

const openPowerSync = () => {
  const db = new PowerSyncDatabase({
    database: { dbFilename: 'test.db' },
    schema: new commonSdk.Schema({
      lists: new commonSdk.Table({
        name: commonSdk.column.text
      })
    })
  });

  onTestFinished(async () => {
    await db.disconnectAndClear();
    await db.close();
  });

  return db;
};

describe('useQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup(); // Cleanup the DOM after each test
  });

  it('should error when PowerSync is not set', async () => {
    const { result } = renderHook(() => useQuery('SELECT * from lists'));
    const currentResult = result.current;
    expect(currentResult.error).toEqual(Error('PowerSync not configured.'));
    expect(currentResult.isLoading).toEqual(false);
    expect(currentResult.data).toEqual([]);
  });

  it('should set isLoading to true on initial load', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={openPowerSync()}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists'), { wrapper });
    const currentResult = result.current;
    expect(currentResult.isLoading).toEqual(true);
  });

  it('should run the query once if runQueryOnce flag is set', async () => {
    const db = openPowerSync();
    const onChangeSpy = vi.spyOn(db, 'onChangeWithCallback');
    const getAllSpy = vi.spyOn(db, 'getAll');

    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;

    await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['list1']);

    const { result } = renderHook(() => useQuery('SELECT name from lists', [], { runQueryOnce: true }), { wrapper });
    expect(result.current.isLoading).toEqual(true);

    await waitFor(
      async () => {
        const currentResult = result.current;
        expect(currentResult.data).toEqual([{ name: 'list1' }]);
        expect(currentResult.isLoading).toEqual(false);
        expect(currentResult.isFetching).toEqual(false);
        expect(onChangeSpy).not.toHaveBeenCalled();
        expect(getAllSpy).toHaveBeenCalledTimes(1);
      },
      { timeout: 100 }
    );
  });

  it('should rerun the query when refresh is used', async () => {
    const db = openPowerSync();
    const getAllSpy = vi.spyOn(db, 'getAll');

    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;

    const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), { wrapper });

    expect(result.current.isLoading).toEqual(true);

    let refresh;

    await waitFor(
      () => {
        const currentResult = result.current;
        refresh = currentResult.refresh;
        expect(currentResult.isLoading).toEqual(false);
        expect(getAllSpy).toHaveBeenCalledTimes(1);
      },
      { timeout: 500, interval: 100 }
    );

    await act(() => refresh());

    expect(getAllSpy).toHaveBeenCalledTimes(2);
  });

  it('should set error when error occurs and runQueryOnce flag is set', async () => {
    const db = openPowerSync();

    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;

    const { result } = renderHook(() => useQuery('SELECT * from faketable', [], { runQueryOnce: true }), { wrapper });

    await waitFor(
      async () => {
        expect(result.current.error?.message).equal('no such table: faketable');
      },
      { timeout: 500, interval: 100 }
    );
  });

  it('should set error when error occurs with watched query', async () => {
    const db = openPowerSync();

    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;

    const { result } = renderHook(() => useQuery('SELECT * from faketable', []), { wrapper });

    await waitFor(
      async () => {
        expect(result.current.error?.message).equals('no such table: faketable');
      },
      { timeout: 500, interval: 100 }
    );

    console.log('got to this point');
  });

  it('should accept compilable queries', async () => {
    const db = openPowerSync();

    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;

    const { result } = renderHook(
      () => useQuery({ execute: () => [] as any, compile: () => ({ sql: 'SELECT * from lists', parameters: [] }) }),
      { wrapper }
    );
    const currentResult = result.current;
    expect(currentResult.isLoading).toEqual(true);
  });

  it('should execute compatible queries', async () => {
    const db = openPowerSync();

    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;

    const query = () =>
      useQuery({
        execute: () => [{ test: 'custom' }] as any,
        compile: () => ({ sql: 'SELECT * from lists', parameters: [] })
      });
    const { result } = renderHook(query, { wrapper });

    await vi.waitFor(
      () => {
        expect(result.current.data[0]?.test).toEqual('custom');
      },
      { timeout: 500, interval: 100 }
    );
  });

  it('should show an error if parsing the query results in an error', async () => {
    const db = openPowerSync();

    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;

    const { result } = renderHook(
      () =>
        useQuery({
          execute: () => [] as any,
          compile: () => {
            throw new Error('error');
          }
        }),
      { wrapper }
    );

    await waitFor(
      async () => {
        const currentResult = result.current;
        expect(currentResult.isLoading).toEqual(false);
        expect(currentResult.isFetching).toEqual(false);
        expect(currentResult.data).toEqual([]);
        expect(currentResult.error).toEqual(Error('error'));
      },
      { timeout: 500, interval: 100 }
    );
  });

  it('should emit result data when query changes', async () => {
    const db = openPowerSync();
    const wrapper = ({ children }) => <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>;
    const { result } = renderHook(() => useQuery('SELECT * FROM lists WHERE name = ?', ['aname']), { wrapper });

    expect(result.current.isLoading).toEqual(true);

    await waitFor(
      async () => {
        const { current } = result;
        expect(current.isLoading).toEqual(false);
      },
      { timeout: 500, interval: 100 }
    );

    // This should trigger an update
    await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['aname']);

    await waitFor(
      async () => {
        const { current } = result;
        expect(current.data.length).toEqual(1);
      },
      { timeout: 500, interval: 100 }
    );

    const {
      current: { data }
    } = result;

    const deferred = pDefer();

    const baseGetAll = db.getAll;
    const getSpy = vi.spyOn(db, 'getAll').mockImplementation(async (sql, params) => {
      // Allow pausing this call
      await deferred.promise;
      return baseGetAll.call(db, sql, params);
    });

    // The number of calls should be incremented after we make a change
    const numberOfCalls = getSpy.mock.calls.length + 1;
    // This should not trigger an update
    await db.execute('INSERT INTO lists(id, name) VALUES (uuid(), ?)', ['anothername']);

    await waitFor(
      () => {
        expect(result.current.isFetching).toEqual(true);
      },
      { timeout: 500, interval: 100 }
    );

    // Allow the result to be returned
    deferred.resolve();

    // We should still read the data from the DB
    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledTimes(numberOfCalls);
      expect(result.current.isFetching).toEqual(false);
    });

    // The data reference should be the same as the previous time
    expect(data == result.current.data).toEqual(true);
  });

  // TODO: Add tests for powersync.onChangeWithCallback path
});
