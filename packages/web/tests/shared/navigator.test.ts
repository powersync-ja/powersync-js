import { describe, it, expect, vi, afterEach } from 'vitest';
import { getNavigatorLocks } from '../../src/shared/navigator';

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
