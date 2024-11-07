import * as commonSdk from '@powersync/common';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { useQuery } from '../src/hooks/useQuery';

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => {}),
  resolveTables: vi.fn(() => ['table1', 'table2']),
  onChangeWithCallback: vi.fn(),
  getAll: vi.fn(() => Promise.resolve(['list1', 'list2']))
};

vi.mock('./PowerSyncContext', () => ({
  useContext: vi.fn(() => mockPowerSync)
}));

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
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists'), { wrapper });
    const currentResult = result.current;
    expect(currentResult.isLoading).toEqual(true);
  });

  it('should run the query once if runQueryOnce flag is set', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), { wrapper });
    expect(result.current.isLoading).toEqual(true);

    await waitFor(
      async () => {
        const currentResult = result.current;
        expect(currentResult.data).toEqual(['list1', 'list2']);
        expect(currentResult.isLoading).toEqual(false);
        expect(currentResult.isFetching).toEqual(false);
        expect(mockPowerSync.onChangeWithCallback).not.toHaveBeenCalled();
        expect(mockPowerSync.getAll).toHaveBeenCalledTimes(1);
      },
      { timeout: 100 }
    );
  });

  it('should rerun the query when refresh is used', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), { wrapper });

    expect(result.current.isLoading).toEqual(true);

    let refresh;

    await waitFor(
      async () => {
        const currentResult = result.current;
        refresh = currentResult.refresh;
        expect(currentResult.isLoading).toEqual(false);
        expect(mockPowerSync.getAll).toHaveBeenCalledTimes(1);
      },
      { timeout: 100 }
    );

    await refresh();
    expect(mockPowerSync.getAll).toHaveBeenCalledTimes(2);
  });

  it('should set error when error occurs and runQueryOnce flag is set', async () => {
    const mockPowerSyncError = {
      currentStatus: { status: 'initial' },
      registerListener: vi.fn(() => {}),
      onChangeWithCallback: vi.fn(),
      resolveTables: vi.fn(() => ['table1', 'table2']),
      getAll: vi.fn(() => {
        throw new Error('some error');
      })
    };

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSyncError as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), { wrapper });

    await waitFor(
      async () => {
        expect(result.current.error).toEqual(Error('PowerSync failed to fetch data: some error'));
      },
      { timeout: 100 }
    );
  });

  it('should set error when error occurs', async () => {
    const mockPowerSyncError = {
      currentStatus: { status: 'initial' },
      registerListener: vi.fn(() => {}),
      onChangeWithCallback: vi.fn(),
      resolveTables: vi.fn(() => ['table1', 'table2']),
      getAll: vi.fn(() => {
        throw new Error('some error');
      })
    };

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSyncError as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists', []), { wrapper });

    await waitFor(
      async () => {
        expect(result.current.error).toEqual(Error('PowerSync failed to fetch data: some error'));
      },
      { timeout: 100 }
    );
  });

  it('should accept compilable queries', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(
      () => useQuery({ execute: () => [] as any, compile: () => ({ sql: 'SELECT * from lists', parameters: [] }) }),
      { wrapper }
    );
    const currentResult = result.current;
    expect(currentResult.isLoading).toEqual(true);
  });

  it('should execute compatible queries', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const query = () =>
      useQuery({
        execute: () => [{ test: 'custom' }] as any,
        compile: () => ({ sql: 'SELECT * from lists', parameters: [] })
      });
    const { result } = renderHook(query, { wrapper });

    await vi.waitFor(() => {
      expect(result.current.data[0]?.test).toEqual('custom');
    });
  });

  it('should show an error if parsing the query results in an error', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );
    vi.spyOn(commonSdk, 'parseQuery').mockImplementation(() => {
      throw new Error('error');
    });

    const { result } = renderHook(
      () =>
        useQuery({
          execute: () => [] as any,
          compile: () => ({ sql: 'SELECT * from lists', parameters: ['param'] })
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
      { timeout: 100 }
    );
  });

  // TODO: Add tests for powersync.onChangeWithCallback path
});
