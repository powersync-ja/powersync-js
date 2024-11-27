import * as commonSdk from '@powersync/common';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncContext } from '@powersync/react/';
import { useQuery } from '../src/hooks/useQuery';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => { }),
  resolveTables: vi.fn(() => ['table1', 'table2']),
  onChangeWithCallback: vi.fn(),
  getAll: vi.fn(() => Promise.resolve(['list1', 'list2']))
};

vi.mock('./PowerSyncContext', () => ({
  useContext: vi.fn(() => mockPowerSync)
}));

describe('useQuery', () => {
  let queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    }
  })

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient.clear();

    vi.clearAllMocks();
    cleanup(); // Cleanup the DOM after each test
  });


  it('should set loading states on initial load', async () => {
    const { result } = renderHook(() => useQuery({
      queryKey: ['lists'],
      query: 'SELECT * from lists'
    }), { wrapper });
    const currentResult = result.current;
    expect(currentResult.isLoading).toEqual(true);
    expect(currentResult.isFetching).toEqual(true);
  });

  it('should execute string queries', async () => {
    const query = () =>
      useQuery({
        queryKey: ['lists'],
        query: "SELECT * from lists"
      });
    const { result } = renderHook(query, { wrapper });

    await vi.waitFor(() => {
      expect(result.current.data![0]).toEqual('list1');
      expect(result.current.data![1]).toEqual('list2');
    }, { timeout: 500 });
  });

  it('should set error during query execution', async () => {
    const mockPowerSyncError = {
      currentStatus: { status: 'initial' },
      registerListener: vi.fn(() => { }),
      onChangeWithCallback: vi.fn(),
      resolveTables: vi.fn(() => ['table1', 'table2']),
      getAll: vi.fn(() => {
        throw new Error('some error');
      })
    };

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <PowerSyncContext.Provider value={mockPowerSyncError as any}>{children}</PowerSyncContext.Provider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useQuery({
      queryKey: ['lists'],
      query: 'SELECT * from lists'
    }), { wrapper });

    await waitFor(
      async () => {
        expect(result.current.error).toEqual(Error('some error'));
      },
      { timeout: 100 }
    );
  });

  it('should execute compatible queries', async () => {
    const compilableQuery = {
      execute: () => [{ test: 'custom' }] as any,
      compile: () => ({ sql: 'SELECT * from lists' })
    } as commonSdk.CompilableQuery<any>;

    const query = () =>
      useQuery({
        queryKey: ['lists'],
        query: compilableQuery
      });
    const { result } = renderHook(query, { wrapper });

    await vi.waitFor(() => {
      expect(result.current.data![0].test).toEqual('custom');
    }, { timeout: 500 });
  });

  it('should show an error if parsing the query results in an error', async () => {
    const compilableQuery = {
      execute: () => [] as any,
      compile: () => ({ sql: 'SELECT * from lists', parameters: ['param'] })
    } as commonSdk.CompilableQuery<any>;

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['lists'],
          query: compilableQuery,
          parameters: ['redundant param']
        }),
      { wrapper }
    );

    await waitFor(
      async () => {
        const currentResult = result.current;
        expect(currentResult.isLoading).toEqual(false);
        expect(currentResult.isFetching).toEqual(false);
        expect(currentResult.error).toEqual(Error('You cannot pass parameters to a compiled query.'));
        expect(currentResult.data).toBeUndefined()
      },
      { timeout: 100 }
    );
  });

});
