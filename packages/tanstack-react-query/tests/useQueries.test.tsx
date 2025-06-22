import * as commonSdk from '@powersync/common';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncContext } from '@powersync/react/';
import { useQueries } from '../src/hooks/useQueries';
import { QueryClient, QueryClientProvider, QueryKey } from '@tanstack/react-query';
import { expectTypeOf } from 'vitest';

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => {}),
  resolveTables: vi.fn(() => ['table1', 'table2']),
  onChangeWithCallback: vi.fn(),
  getAll: vi.fn((sql, params) => Promise.resolve([sql, ...(params || [])]))
};

describe('useQueries', () => {
  let queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    cleanup();
  });

  it('should set loading states on initial load for all queries', async () => {
    const { result } = renderHook(
      () =>
        useQueries({
          queries: [
            { queryKey: ['q1'], query: 'SELECT 1' },
            { queryKey: ['q2'], query: 'SELECT 2' }
          ]
        }),
      { wrapper }
    );

    const results = result.current as any[];
    expect(results[0].isLoading).toEqual(true);
    expect(results[1].isLoading).toEqual(true);
  });

  it('should execute string queries and return correct data', async () => {
    const { result } = renderHook(
      () =>
        useQueries({
          queries: [
            { queryKey: ['q1'], query: 'SELECT 1', parameters: [42] },
            { queryKey: ['q2'], query: 'SELECT 2', parameters: [99] }
          ]
        }),
      { wrapper }
    );

    await waitFor(() => {
      const results = result.current as any[];
      expect(results[0].data[0]).toEqual('SELECT 1');
      expect(results[0].data[1]).toEqual(42);
      expect(results[1].data[0]).toEqual('SELECT 2');
      expect(results[1].data[1]).toEqual(99);
    });
  });

  it('should execute compilable queries', async () => {
    const compilableQuery = {
      execute: () => [{ test: 'custom' }],
      compile: () => ({ sql: 'SELECT * from lists' })
    } as unknown as commonSdk.CompilableQuery<any>;

    const { result } = renderHook(
      () =>
        useQueries({
          queries: [
            { queryKey: ['q1'], query: compilableQuery },
            { queryKey: ['q2'], query: 'SELECT 2' }
          ]
        }),
      { wrapper }
    );

    await waitFor(() => {
      const results = result.current as any[];
      expect(results[0].data[0].test).toEqual('custom');
      expect(results[1].data[0]).toEqual('SELECT 2');
    });
  });

  it('should set error during query execution', async () => {
    const mockPowerSyncError = {
      ...mockPowerSync,
      getAll: vi.fn(() => {
        throw new Error('some error');
      })
    };
    const errorWrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <PowerSyncContext.Provider value={mockPowerSyncError as any}>{children}</PowerSyncContext.Provider>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useQueries({
          queries: [
            { queryKey: ['q1'], query: 'SELECT 1' },
            { queryKey: ['q2'], query: 'SELECT 2' }
          ]
        }),
      { wrapper: errorWrapper }
    );

    await waitFor(() => {
      const results = result.current as any[];
      expect(results[0].error).toEqual(Error('some error'));
      expect(results[1].error).toEqual(Error('some error'));
    });
  });

  it('should support parameters and merge/combine results', async () => {
    const { result } = renderHook(
      () =>
        useQueries({
          queries: [
            { queryKey: ['q1'], query: 'SELECT 1', parameters: [1] },
            { queryKey: ['q2'], query: 'SELECT 2', parameters: [2] }
          ],
          combine: (results) => results.map((r) => r.data).flat()
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current).toContain('SELECT 1');
      expect(result.current).toContain(1);
      expect(result.current).toContain('SELECT 2');
      expect(result.current).toContain(2);
    });
  });

  it('should show an error if parsing the query results in an error', async () => {
    const compilableQuery = {
      execute: () => [] as any,
      compile: () => ({ sql: 'SELECT * from lists', parameters: ['param'] })
    } as unknown as commonSdk.CompilableQuery<any>;

    const { result } = renderHook(
      () =>
        useQueries({
          queries: [
            { queryKey: ['q1'], query: compilableQuery, parameters: ['redundant param'] },
            { queryKey: ['q2'], query: 'SELECT 2' }
          ]
        }),
      { wrapper }
    );

    await waitFor(() => {
      const results = result.current as any[];
      expect(results[0].error).toEqual(Error('You cannot pass parameters to a compiled query.'));
      expect(results[0].data).toBeUndefined();
    });
  });

  describe.skip('Type Tests', () => {
    // This is a dummy test that contains all the type tests
    // It is not intended to be run, but to be checked by the TypeScript compiler
    it('should have correct types', () => {
      // === Manual explicit typing without combine ===
      const manual = useQueries<[{ foo: number }, { baz: string }]>({
        queries: [
          { queryKey: ['q1'], query: 'SELECT foo FROM bar' },
          { queryKey: ['q2'], query: 'SELECT baz FROM qux' }
        ]
      });

      // Should infer correct types
      expectTypeOf(manual[0].data).toEqualTypeOf<{ foo: number }[] | undefined>();
      expectTypeOf(manual[1].data).toEqualTypeOf<{ baz: string }[] | undefined>();
      expectTypeOf(manual).toHaveProperty('0');
      expectTypeOf(manual).toHaveProperty('1');
      expectTypeOf(manual).not.toHaveProperty('2');

      // === Manual explicit typing with combine ===
      const manualCombine = useQueries<[{ foo: number }, { bar: string }], { total: number }>({
        queries: [
          { queryKey: ['q1'], query: 'SELECT foo FROM test' },
          { queryKey: ['q2'], query: 'SELECT bar FROM test' }
        ],
        combine: (results) => {
          // Should have correct input types
          expectTypeOf(results[0].data).toEqualTypeOf<{ foo: number }[] | undefined>();
          expectTypeOf(results[1].data).toEqualTypeOf<{ bar: string }[] | undefined>();
          return { total: 42 };
        }
      });

      // Should have combine return type
      expectTypeOf(manualCombine).toEqualTypeOf<{ total: number }>();
      expectTypeOf(manualCombine).toHaveProperty('total');
      expectTypeOf(manualCombine).not.toHaveProperty('0');

      // === Auto inference with CompilableQuery without combine ===
      type User = { id: number; name: string };
      type Post = { id: number; title: string; userId: number };

      const userQuery: commonSdk.CompilableQuery<User> = {
        execute: () => Promise.resolve([{ id: 1, name: 'John' }]),
        compile: () => ({ sql: 'SELECT * FROM users', parameters: [] })
      };

      const postQuery: commonSdk.CompilableQuery<Post> = {
        execute: () => Promise.resolve([{ id: 1, title: 'Hello', userId: 1 }]),
        compile: () => ({ sql: 'SELECT * FROM posts', parameters: [] })
      };

      const autoInfer = useQueries({
        queries: [
          { queryKey: ['users'], query: userQuery },
          { queryKey: ['posts'], query: postQuery }
        ]
      } as const);

      // Should infer correct types from CompilableQuery
      expectTypeOf(autoInfer[0].data).toEqualTypeOf<User[] | undefined>();
      expectTypeOf(autoInfer[1].data).toEqualTypeOf<Post[] | undefined>();

      // === Auto inference with CompilableQuery with combine ===
      const autoInferCombine = useQueries({
        queries: [
          { queryKey: ['users'], query: userQuery },
          { queryKey: ['posts'], query: postQuery }
        ],
        combine: (results) => {
          // Should have correct input types
          expectTypeOf(results[0].data).toEqualTypeOf<User[] | undefined>();
          expectTypeOf(results[1].data).toEqualTypeOf<Post[] | undefined>();

          return {
            users: results[0].data || [],
            posts: results[1].data || [],
            combined: true
          };
        }
      });

      // Should have combine return type
      expectTypeOf(autoInferCombine).toEqualTypeOf<{
        users: User[];
        posts: Post[];
        combined: boolean;
      }>();
      expectTypeOf(autoInferCombine).toHaveProperty('users');
      expectTypeOf(autoInferCombine).toHaveProperty('posts');
      expectTypeOf(autoInferCombine).toHaveProperty('combined');
      expectTypeOf(autoInferCombine).not.toHaveProperty('0');

      // === Mixed queries (CompilableQuery + string) without combine ===
      const mixed = useQueries({
        queries: [
          { queryKey: ['typed'], query: userQuery },
          { queryKey: ['untyped'], query: 'SELECT * FROM something' }
        ]
      } as const);

      // First should be typed, second should be unknown
      expectTypeOf(mixed[0].data).toEqualTypeOf<User[] | undefined>();
      expectTypeOf(mixed[1].data).toEqualTypeOf<unknown[] | undefined>();

      // === Mixed queries with combine ===
      const mixedCombine = useQueries({
        queries: [
          { queryKey: ['typed'], query: userQuery },
          { queryKey: ['untyped'], query: 'SELECT count(*) as total' }
        ],
        combine: (results) => {
          // First result typed, second unknown
          expectTypeOf(results[0].data?.[0].name).toEqualTypeOf<string | undefined>();
          expectTypeOf(results[1].data).toEqualTypeOf<unknown[] | undefined>();
          return results.map((r) => r.data?.length || 0);
        }
      });

      // Should be number[]
      expectTypeOf(mixedCombine).toEqualTypeOf<number[]>();
      expectTypeOf(mixedCombine).not.toHaveProperty('users');

      // === No queries (empty array) ===
      const empty = useQueries({
        queries: []
      });

      // Should be an empty array type
      expectTypeOf(empty).toEqualTypeOf<[]>();
      expectTypeOf(empty).not.toHaveProperty('0');

      // === Parameters typing ===
      const withParams = useQueries<[{ count: number }]>({
        queries: [
          {
            queryKey: ['count'],
            query: 'SELECT COUNT(*) as count FROM users WHERE active = ?',
            parameters: [true] // Should accept any[]
          }
        ]
      });

      expectTypeOf(withParams[0].data).toEqualTypeOf<{ count: number }[] | undefined>();

      // === Query options inheritance ===
      const withOptions = useQueries({
        queries: [
          {
            queryKey: ['users'],
            query: userQuery,
            enabled: true,
            staleTime: 5000,
            refetchOnWindowFocus: false
          }
        ]
      });

      // Should still have correct data typing
      expectTypeOf(withOptions[0].data).toEqualTypeOf<User[] | undefined>();

      // === Combine function parameter typing ===
      const combineParamTest = useQueries({
        queries: [
          { queryKey: ['q1'], query: userQuery },
          { queryKey: ['q2'], query: postQuery }
        ],
        combine: (results) => {
          // Test that results parameter has correct structure
          expectTypeOf(results.length).toEqualTypeOf<2>();
          expectTypeOf(results[0].data).toEqualTypeOf<User[] | undefined>();
          expectTypeOf(results[0].isLoading).toEqualTypeOf<boolean>();
          expectTypeOf(results[1].data).toEqualTypeOf<Post[] | undefined>();

          expectTypeOf(results).not.toHaveProperty('2');

          expectTypeOf(results[0].queryKey).toEqualTypeOf<readonly unknown[]>();
          expectTypeOf(results[1].queryKey).toEqualTypeOf<readonly unknown[]>();

          return 'test';
        }
      });

      // Should be string (return type of combine)
      expectTypeOf(combineParamTest).toEqualTypeOf<string>();

      // === Without combine should return tuple ===
      const tupleTest = useQueries({
        queries: [
          { queryKey: ['q1'], query: userQuery },
          { queryKey: ['q2'], query: postQuery }
        ]
      });

      expectTypeOf(tupleTest[0].data).toEqualTypeOf<User[] | undefined>();
      expectTypeOf(tupleTest[1].data).toEqualTypeOf<Post[] | undefined>();
      expectTypeOf(tupleTest).not.toHaveProperty('2');

      // === Complex combine return types ===
      const complexCombine = useQueries({
        queries: [
          { queryKey: ['users'], query: userQuery },
          { queryKey: ['posts'], query: postQuery }
        ],
        combine: (results) => {
          if (results[0].isLoading || results[1].isLoading) {
            return { loading: true } as const;
          }

          return {
            loading: false,
            data: {
              userCount: results[0].data?.length || 0,
              postTitles: results[1].data?.map((p) => p.title) || []
            }
          } as const;
        }
      });

      if (complexCombine.loading === true) {
        expectTypeOf(complexCombine).toEqualTypeOf<{ readonly loading: true; readonly data?: undefined }>();
      } else {
        expectTypeOf(complexCombine).toEqualTypeOf<{
          readonly loading: false;
          readonly data: {
            readonly userCount: number;
            readonly postTitles: string[];
          };
        }>();
      }
    });
  });
});
