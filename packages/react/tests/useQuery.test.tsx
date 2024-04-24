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
  watch: vi.fn(),
  getAll: vi.fn(() => ['list1', 'list2'])
};

vi.mock('./PowerSyncContext', () => ({
  useContext: vi.fn(() => mockPowerSync)
}));

describe('useQuery', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should error when PowerSync is not set', () => {
    const { result } = renderHook(() => useQuery('SELECT * from lists'));
    expect(result.current.error).toEqual(Error('PowerSync not configured.'));
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.data).toEqual([]);
  });

  it('should set isLoading to true on initial load', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists'), { wrapper });
    expect(result.current.isLoading).toEqual(true);
  });

  it('should run the query once if runQueryOnce flag is set', async () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), { wrapper });
    expect(result.current.isLoading).toEqual(true);

    waitFor(
      () => {
        expect(result.current.isLoading).toEqual(false);
        expect(result.current.data).toEqual(['list1', 'list2']);
        expect(result.current.isLoading).toEqual(false);
        expect(mockPowerSync.watch).not.toHaveBeenCalled();
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

    waitFor(
      () => {
        refresh = result.current.refresh;
        expect(result.current.isLoading).toEqual(false);
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
      watch: vi.fn(),
      getAll: vi.fn(() => {
        throw new Error('some error');
      })
    };

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSyncError as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }), { wrapper });
    expect(result.current.error).toEqual(Error('PowerSync failed to fetch data: some error'));
  });

  // TODO: Add tests for powersync.watch path
});
