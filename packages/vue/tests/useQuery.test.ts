import flushPromises from 'flush-promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isProxy, isRef, ref } from 'vue';
import * as PowerSync from '../src/composables/powerSync';
import { useQuery } from '../src/composables/useQuery';
import { withSetup } from './utils';

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => {}),
  resolveTables: vi.fn(),
  watch: vi.fn(),
  onChangeWithCallback: vi.fn(),
  getAll: vi.fn(() => ['list1', 'list2'])
};

describe('useQuery', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should error when PowerSync is not set', () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(undefined);

    const [{ data, isLoading, isFetching, error }] = withSetup(() => useQuery('SELECT * from lists'));

    expect(error.value).toEqual(Error('PowerSync not configured.'));
    expect(isFetching.value).toEqual(false);
    expect(isLoading.value).toEqual(false);
    expect(data.value).toEqual([]);
  });

  it('should handle error in watchEffect', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(undefined);

    const [{ data, isLoading, isFetching, error }] = withSetup(() => useQuery('SELECT * from lists'));

    expect(error.value).toEqual(Error('PowerSync not configured.'));
    expect(isFetching.value).toEqual(false);
    expect(isLoading.value).toEqual(false);
    expect(data.value).toEqual([]);
  });

  it('should run the query once when runQueryOnce flag is set', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);
    const getAllSpy = mockPowerSync.getAll;

    const [{ data, isLoading, isFetching, error }] = withSetup(() =>
      useQuery('SELECT * from lists', [], { runQueryOnce: true })
    );
    await flushPromises();

    expect(getAllSpy).toHaveBeenCalledTimes(1);
    expect(data.value).toEqual(['list1', 'list2']);
    expect(isLoading.value).toEqual(false);
    expect(isFetching.value).toEqual(false);
    expect(error.value).toEqual(undefined);
  });

  // ensure that Proxy wrapper object is stripped
  it('should propagate raw reactive sql parameters', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);
    const getAllSpy = mockPowerSync.getAll;

    const [{ data, isLoading, isFetching, error }] = withSetup(() =>
      useQuery('SELECT * from lists where id = $1', ref([ref('test')]))
    );
    await flushPromises();
    expect(getAllSpy).toHaveBeenCalledTimes(1);
    const sqlParam = (getAllSpy.mock.calls[0] as Array<any>)[1];
    expect(isRef(sqlParam)).toEqual(false);
    expect(isProxy(sqlParam)).toEqual(false);
  });

  it('should rerun the query when refresh is used', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);
    const getAllSpy = mockPowerSync.getAll;

    const [{ isLoading, isFetching, refresh }] = withSetup(() =>
      useQuery('SELECT * from lists', [], { runQueryOnce: true })
    );
    expect(isFetching.value).toEqual(true);
    expect(isLoading.value).toEqual(true);

    await flushPromises();
    expect(isFetching.value).toEqual(false);
    expect(isLoading.value).toEqual(false);

    expect(getAllSpy).toHaveBeenCalledTimes(1);

    const refreshPromise = refresh?.();
    expect(isFetching.value).toEqual(true);
    expect(isLoading.value).toEqual(false); // only used for initial loading

    await refreshPromise;
    expect(isFetching.value).toEqual(false);

    expect(getAllSpy).toHaveBeenCalledTimes(2);
  });

  it('should set error when error occurs and runQueryOnce flag is set', async () => {
    const mockPowerSyncError = {
      ...mockPowerSync,
      getAll: vi.fn(() => {
        throw new Error('some error');
      })
    };
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSyncError) as any);

    const [{ error }] = withSetup(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }));
    await flushPromises();

    expect(error.value).toEqual(Error('PowerSync failed to fetch data: some error'));
  });

  it('should set error when error occurs', async () => {
    const mockPowerSyncError = {
      ...mockPowerSync,
      getAll: vi.fn(() => {
        throw new Error('some error');
      })
    };
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSyncError) as any);

    const [{ error }] = withSetup(() => useQuery('SELECT * from lists', []));
    await flushPromises();

    expect(error.value).toEqual(Error('PowerSync failed to fetch data: some error'));
  });

  it('should accept compilable queries', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);

    const [{ isLoading }] = withSetup(() =>
      useQuery({ execute: () => [] as any, compile: () => ({ sql: 'SELECT * from lists', parameters: [] }) })
    );

    expect(isLoading.value).toEqual(true);
    await flushPromises();
    expect(isLoading.value).toEqual(false);
  });

  it('should execute compilable queries', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);

    const [{ isLoading, data }] = withSetup(() =>
      useQuery({
        execute: () => [{ test: 'custom' }] as any,
        compile: () => ({ sql: 'SELECT * from lists', parameters: [] })
      })
    );

    expect(isLoading.value).toEqual(true);
    await flushPromises();
    expect(isLoading.value).toEqual(false);
    expect(data.value[0].test).toEqual('custom');
  });

  it('should set error for compilable query on useQuery parameters', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);

    const [{ error }] = withSetup(() =>
      useQuery({ execute: () => [] as any, compile: () => ({ sql: 'SELECT * from lists', parameters: [] }) }, ['x'])
    );

    expect(error.value).toEqual(
      Error('PowerSync failed to fetch data: You cannot pass parameters to a compiled query.')
    );
  });
});
