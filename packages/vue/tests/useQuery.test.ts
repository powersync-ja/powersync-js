import * as commonSdk from '@powersync/common';
import { PowerSyncDatabase } from '@powersync/web';
import flushPromises from 'flush-promises';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { computed, isProxy, isRef, ref, watchEffect } from 'vue';
import { createPowerSyncPlugin } from '../src/composables/powerSync';
import { useQuery } from '../src/composables/useQuery';
import { useWatchedQuerySubscription } from '../src/composables/useWatchedQuerySubscription';
import { withSetup } from './utils';

export const openPowerSync = () => {
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
  let powersync: commonSdk.AbstractPowerSyncDatabase | null;

  beforeEach(() => {
    powersync = openPowerSync();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const withPowerSyncSetup = <Result>(callback: () => Result) => {
    return withSetup(callback, (app) => {
      const { install } = createPowerSyncPlugin({ database: powersync! });
      install(app);
    });
  };

  it('should error when PowerSync is not set', () => {
    powersync = null;
    const [{ data, isLoading, isFetching, error }] = withPowerSyncSetup(() => useQuery('SELECT * from lists'));

    expect(error.value?.message).toEqual('PowerSync not configured.');
    expect(isFetching.value).toEqual(false);
    expect(isLoading.value).toEqual(false);
    expect(data.value).toEqual([]);
  });

  it('should handle error in watchEffect', async () => {
    powersync = null;

    const [{ data, isLoading, isFetching, error }] = withPowerSyncSetup(() => useQuery('SELECT * from lists'));

    expect(error.value).toEqual(Error('PowerSync not configured.'));
    expect(isFetching.value).toEqual(false);
    expect(isLoading.value).toEqual(false);
    expect(data.value).toEqual([]);
  });

  it('should run the query once when runQueryOnce flag is set', async () => {
    await powersync!.execute(/* sql */ `
      INSERT INTO
        lists (id, name)
      VALUES
        (uuid (), 'list1');
    `);

    const [{ data, isLoading, isFetching, error }] = withPowerSyncSetup(() =>
      useQuery('SELECT * from lists', [], { runQueryOnce: true })
    );

    await vi.waitFor(
      () => {
        expect(data.value.map((item) => item.name)).toEqual(['list1']);
        expect(isLoading.value).toEqual(false);
        expect(isFetching.value).toEqual(false);
        expect(error.value).toEqual(undefined);
      },
      { timeout: 1000 }
    );
  });

  // ensure that Proxy wrapper object is stripped
  it('should propagate raw reactive sql parameters', async () => {
    const getAllSpy = vi.spyOn(powersync!, 'getAll');

    const [{ data, isLoading, isFetching, error }] = withPowerSyncSetup(() =>
      useQuery('SELECT * from lists where id = $1', ref([ref('test')]))
    );

    await vi.waitFor(
      () => {
        expect(getAllSpy).toHaveBeenCalledTimes(3);
        const sqlParam = (getAllSpy.mock.calls[2] as Array<any>)[1];
        expect(isRef(sqlParam)).toEqual(false);
        expect(isProxy(sqlParam)).toEqual(false);
      },
      { timeout: 1000 }
    );
  });

  it('should use an existing WatchedQuery instance', async () => {
    // This query can be instantiated once and reused.
    // The query retains it's state and will not re-fetch the data unless the result changes.
    // This is useful for queries that are used in multiple components.
    const listsQuery = powersync!
      .query<{ id: string; name: string }>({ sql: `SELECT * FROM lists`, parameters: [] })
      .differentialWatch();

    const [state] = withPowerSyncSetup(() => useWatchedQuerySubscription(listsQuery));

    await powersync!.execute(
      /* sql */ `
        INSERT INTO
          lists (id, name)
        VALUES
          (uuid (), ?)
      `,
      ['test']
    );

    await vi.waitFor(
      () => {
        expect(state.data.value.length).eq(1);
      },
      { timeout: 1000 }
    );
  });

  it('should rerun the query when refresh is used', async () => {
    const getAllSpy = vi.spyOn(powersync!, 'getAll');

    const [{ isLoading, isFetching, refresh }] = withPowerSyncSetup(() =>
      useQuery('SELECT * from lists', [], { runQueryOnce: true })
    );
    expect(isFetching.value).toEqual(true);
    expect(isLoading.value).toEqual(true);

    await vi.waitFor(
      () => {
        expect(isFetching.value).toEqual(false);
        expect(isLoading.value).toEqual(false);
      },
      { timeout: 1000 }
    );

    const callCount = getAllSpy.mock.calls.length;

    const refreshPromise = refresh?.();
    expect(isFetching.value).toEqual(true);
    expect(isLoading.value).toEqual(false); // only used for initial loading

    await refreshPromise;
    expect(isFetching.value).toEqual(false);

    expect(getAllSpy).toHaveBeenCalledTimes(callCount + 1);
  });

  it('should set error when error occurs and runQueryOnce flag is set', async () => {
    vi.spyOn(powersync!, 'getAll').mockImplementation(() => {
      throw new Error('some error');
    });

    const [{ error }] = withPowerSyncSetup(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }));
    await flushPromises();

    expect(error.value?.message).toEqual('PowerSync failed to fetch data: some error');
  });

  it('should set error when error occurs', async () => {
    vi.spyOn(powersync!, 'getAll').mockImplementation(() => {
      throw new Error('some error');
    });

    const [{ error }] = withPowerSyncSetup(() => useQuery('SELECT * from lists', []));
    await vi.waitFor(
      () => {
        expect(error.value?.message).toEqual('PowerSync failed to fetch data: some error');
      },
      { timeout: 1000 }
    );
  });

  it('should accept compilable queries', async () => {
    const [{ isLoading }] = withPowerSyncSetup(() =>
      useQuery({ execute: () => [] as any, compile: () => ({ sql: 'SELECT * from lists', parameters: [] }) })
    );

    expect(isLoading.value).toEqual(true);
    await vi.waitFor(
      () => {
        expect(isLoading.value).toEqual(false);
      },
      { timeout: 1000 }
    );
  });

  it('should execute compilable queries', async () => {
    const [result] = withPowerSyncSetup(() =>
      useQuery({
        execute: () => [{ test: 'custom' }] as any,
        compile: () => ({ sql: 'SELECT * from lists', parameters: [] })
      })
    );

    const { isLoading, data } = result;

    expect(isLoading.value).toEqual(true);

    await vi.waitFor(
      () => {
        expect(isLoading.value).toEqual(false);
        expect(data.value[0].test).toEqual('custom');
      },
      { timeout: 1000 }
    );
  });

  it('should set error for compilable query on useQuery parameters', async () => {
    const [{ error }] = withPowerSyncSetup(() =>
      useQuery({ execute: () => [] as any, compile: () => ({ sql: 'SELECT * from lists', parameters: [] }) }, ['x'])
    );

    expect(error.value?.message).toEqual(
      'PowerSync failed to fetch data: You cannot pass parameters to a compiled query.'
    );
  });

  it('should handle dependent query parameter changes with correct state transitions', async () => {
    const db = openPowerSync();

    await db.execute(/* sql */ `
      INSERT INTO
        lists (id, name)
      VALUES
        (uuid (), 'item1')
    `);

    // Track state transitions
    const stateTransitions: Array<{
      param: string | number;
      dataLength: number;
      isFetching: boolean;
      isLoading: boolean;
    }> = [];

    const [state] = withPowerSyncSetup(() => {
      // First query that provides the parameter - starts with 0, then returns 1
      const paramQuery = useQuery('SELECT 1 as result;', []);
      const param = computed(() => paramQuery.data.value?.[0]?.result ?? 0);

      // Second query that depends on the first query's result
      const dataQuery = useQuery(
        computed(() => 'SELECT * FROM lists LIMIT ?'),
        computed(() => [param.value])
      );

      // Track state changes
      watchEffect(() => {
        const currentState = {
          param: param.value,
          dataLength: dataQuery.data.value?.length || 0,
          isFetching: dataQuery.isFetching.value,
          isLoading: dataQuery.isLoading.value
        };
        stateTransitions.push(currentState);
      });

      return {
        paramData: paramQuery.data,
        data: dataQuery.data,
        isFetching: dataQuery.isFetching,
        isLoading: dataQuery.isLoading,
        param
      };
    });

    // Wait for final state
    await vi.waitFor(
      () => {
        expect(state.isLoading.value).toEqual(false);
        expect(state.isFetching.value).toEqual(false);
        expect(state.data.value?.length).toEqual(1);
        expect(state.paramData.value[0].result).toEqual(1);
      },
      { timeout: 1000 }
    );

    // Find the index where param changes from 0 to 1
    let beforeParamChangeIndex = 0;
    for (const transition of stateTransitions) {
      if (transition.param === 1) {
        beforeParamChangeIndex = stateTransitions.indexOf(transition) - 1;
        break;
      }
    }
    const initialState = stateTransitions[beforeParamChangeIndex];
    expect(initialState).toBeDefined();
    expect(initialState?.param).toEqual(0);
    expect(initialState?.dataLength).toEqual(0);
    expect(initialState?.isFetching).toEqual(true);
    expect(initialState?.isLoading).toEqual(true);

    const paramChangedState = stateTransitions[beforeParamChangeIndex + 1];
    expect(paramChangedState).toBeDefined();
    expect(paramChangedState?.param).toEqual(1);
    expect(paramChangedState?.dataLength).toEqual(0);
    expect(paramChangedState?.isFetching).toEqual(true);
    expect(paramChangedState?.isLoading).toEqual(true);

    const finalState = stateTransitions[beforeParamChangeIndex + 2];
    expect(finalState).toBeDefined();
    expect(finalState.param).toEqual(1);
    expect(finalState.dataLength).toEqual(1);
    expect(finalState.isFetching).toEqual(false);
    expect(finalState.isLoading).toEqual(false);
  });
});
