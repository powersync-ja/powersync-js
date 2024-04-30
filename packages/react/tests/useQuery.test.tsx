import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, expect, it, afterEach } from 'vitest';
import { useQuery } from '../src/hooks/useQuery';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => ({
    statusChanged: vi.fn(() => 'updated')
  })),
  resolveTables: vi.fn(() => ['table1', 'table2']),
  onChangeWithCallback: vi.fn(),
  getAll: vi.fn(() => ['list1', 'list2'])
};

vi.mock('./PowerSyncContext', () => ({
  useContext: vi.fn(() => mockPowerSync)
}));

describe('useQuery', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should error when PowerSync is not set', async () => {
    const { result } = renderHook(() => useQuery('SELECT * from lists'));
    const currentResult = await result.current;
    expect(currentResult.error).toEqual(Error('PowerSync not configured.'));
    expect(currentResult.isLoading).toEqual(false);
    expect(currentResult.data).toEqual([]);
  });

  it('should set isLoading to true on initial load', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists'), { wrapper });
    const currentResult = await result.current;
    expect(currentResult.isLoading).toEqual(true);
  });

  it('should run the query once if runQueryOnce flag is set', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), { wrapper });
    const currentResult = await result.current;
    expect(currentResult.isLoading).toEqual(true);

    waitFor(
      async () => {
        expect(currentResult.isLoading).toEqual(false);
        expect(currentResult.data).toEqual(['list1', 'list2']);
        expect(currentResult.isLoading).toEqual(false);
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
    const currentResult = await result.current;
    expect(currentResult.isLoading).toEqual(true);

    let refresh;

    waitFor(
      async () => {
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
      registerListener: vi.fn(() => ({
        statusChanged: vi.fn(() => 'updated')
      })),
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
    const currentResult = await result.current;

    waitFor(
      async () => {
        expect(currentResult.error).toEqual(Error('PowerSync failed to fetch data: some error'));
      },
      { timeout: 100 }
    );
  });

  it('should set error when error occurs', async () => {
    const mockPowerSyncError = {
      currentStatus: { status: 'initial' },
      registerListener: vi.fn(() => ({
        statusChanged: vi.fn(() => 'updated')
      })),
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
    const currentResult = await result.current;

    waitFor(
      async () => {
        expect(currentResult.error).toEqual(Error('PowerSync failed to fetch data: some error'));
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
    const currentResult = await result.current;
    expect(currentResult.isLoading).toEqual(true);
  });

  // TODO: Add tests for powersync.onChangeWithCallback path
});
