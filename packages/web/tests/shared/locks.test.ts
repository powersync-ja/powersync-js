import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNavigatorLocks, requestNavigatorLock } from '../../src/shared/locks.js';

describe('getNavigationLocks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return native navigator.locks if available', () => {
    const mockLocks = {
      request: vi.fn(),
      query: vi.fn()
    };

    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(mockLocks);

    const result = getNavigatorLocks();
    expect(result).toBe(mockLocks);
  });

  it('should throw an error if navigator.locks is unavailable', () => {
    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(undefined!);

    expect(() => getNavigatorLocks()).toThrowError(
      'Navigator locks are not available in an insecure context. Use a secure context such as HTTPS or http://localhost.'
    );
  });
});

describe('requestNavigatorLock', () => {
  it('can can abort', async () => {
    const lockName = crypto.randomUUID();
    const release = await requestNavigatorLock(lockName);

    await expect(requestNavigatorLock(lockName, { signal: AbortSignal.timeout(100) })).rejects.toThrow();
    release();
    const second = await requestNavigatorLock(lockName, { signal: AbortSignal.timeout(100) });
    second();
  });

  it('notiies when stolen', async () => {
    const lockName = crypto.randomUUID();
    let stolen = false;
    await requestNavigatorLock(lockName, {
      onStolen: () => {
        stolen = true;
      }
    });

    await requestNavigatorLock(lockName, { steal: true });
    expect(stolen).toBeTruthy();
  });
});
