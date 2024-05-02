import flushPromises from 'flush-promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import * as PowerSync from '../src/composables/powerSync';
import { useQuery } from '../src/composables/useQuery';
import { withSetup } from './utils';

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => ({
    statusChanged: vi.fn(() => 'updated')
  })),
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
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref({}) as any);

    const [{ data, isLoading, isFetching, error }] = withSetup(() => useQuery('SELECT * from lists'));

    expect(error.value).toEqual(
      Error('PowerSync failed to fetch data: powerSync.value.resolveTables is not a function')
    );
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
});
