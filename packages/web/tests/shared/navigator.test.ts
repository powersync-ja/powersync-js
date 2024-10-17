import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNavigationLocks } from '../../src/shared/navigator';

describe('getNavigationLocks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return native navigator.locks if available', () => {
    const mockLocks = {
      request: vi.fn(),
      query: vi.fn(),
    };

    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(mockLocks);

    const result = getNavigationLocks();
    expect(result).toBe(mockLocks);
  });

  it('should return fallback implementation if navigator.locks is not available', () => {
    // @ts-ignore
    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(undefined);

    const result = getNavigationLocks();
    expect(result).toHaveProperty('request');
    expect(result).toHaveProperty('query');
    expect(result).not.toBe(navigator.locks);
  });

  it('fallback request should acquire and release a lock', async () => {
    // @ts-ignore
    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(undefined);
    const locks = getNavigationLocks();

    const mockCallback = vi.fn().mockResolvedValue('result');
    const result = await locks.request('test-lock', mockCallback);

    expect(mockCallback).toHaveBeenCalledWith(expect.objectContaining({
      name: 'test-lock',
      mode: 'exclusive'
    }));
    expect(result).toBe('result');
  });

  it('fallback query should return held locks', async () => {
    // @ts-ignore
    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(undefined);
    const locks = getNavigationLocks();

    // Acquire a lock first
    await locks.request('test-lock', async () => {
      const queryResult = await locks.query();
      expect(queryResult.held).toHaveLength(1);
      expect(queryResult.held![0]).toEqual(expect.objectContaining({
        name: 'test-lock',
        mode: 'exclusive'
      }));
      expect(queryResult.pending).toHaveLength(0);
    });

    const finalQueryResult = await locks.query();
    expect(finalQueryResult.held).toHaveLength(0);
  });

  it('fallback implementation should handle concurrent requests', async () => {
    // @ts-ignore
    vi.spyOn(navigator, 'locks', 'get').mockReturnValue(undefined);
    const locks = getNavigationLocks();

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const request1 = locks.request('test-lock', async () => {
      await delay(200);
      return 'first';
    });

    const request2 = locks.request('test-lock', async () => {
      return 'second';
    });

    const [result1, result2] = await Promise.all([request1, request2]);

    expect(result1).toBe('first');
    expect(result2).toBe('second');
  });
});
