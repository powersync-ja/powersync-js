import { vi, describe, expect, it, afterEach } from 'vitest';
import { useQuery } from '../src/composables/useQuery';
import { withSetup } from './utils';
import * as PowerSync from '../src/composables/powerSync';
import { ref } from 'vue';

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => ({
    statusChanged: vi.fn(() => 'updated')
  })),
  resolveTables: vi.fn(),
  watch: vi.fn(),
  getAll: vi.fn(() => ['list1', 'list2'])
};

describe('useQuery', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should error when PowerSync is not set', () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(undefined);

    const [result] = withSetup(() => useQuery('SELECT * from lists'));

    expect(result.error.value).toEqual(Error('PowerSync not configured.'));
    expect(result.isFetching.value).toEqual(false);
    expect(result.isLoading.value).toEqual(false);
    expect(result.data.value).toEqual([]);
  });

  it('should handle error in watchEffect', () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref({}) as any);

    const [result] = withSetup(() => useQuery('SELECT * from lists'));

    expect(result.error.value).toEqual(
      Error('PowerSync failed to fetch data: powerSync.value.resolveTables is not a function')
    );
    expect(result.isFetching.value).toEqual(false);
    expect(result.isLoading.value).toEqual(false);
    expect(result.data.value).toEqual([]);
  });

  it('should run the query once when runQueryOnce flag is set', () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);
    const getAllSpy = mockPowerSync.getAll;

    const [result] = withSetup(() => useQuery('SELECT * from lists', [], { runQueryOnce: true }));

    expect(result.data.value).toEqual(undefined);
    expect(getAllSpy).toHaveBeenCalledTimes(1);
    expect(result.isLoading.value).toEqual(false);
    expect(result.isFetching.value).toEqual(false);
    expect(result.error.value).toEqual(undefined);
  });
});
