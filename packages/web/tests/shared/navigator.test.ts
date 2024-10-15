import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { sdkNavigator } from '../../src/shared/navigator';

describe('sdkNavigator', () => {
  let originalNavigator: Navigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      locks: {
        request: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.stubGlobal('navigator', originalNavigator);
  });

  test('should inherit properties from Navigator', () => {
    expect(sdkNavigator.userAgent).toBe(navigator.userAgent);
  });

  test('should have locks property', () => {
    expect(sdkNavigator.locks).toBeDefined();
    expect(typeof sdkNavigator.locks.request).toBe('function');
  });

  test('should throw error when locks are not available', () => {
    vi.stubGlobal('navigator', { ...originalNavigator, locks: undefined });
    expect(() => sdkNavigator.locks).toThrowError('Navigator locks are not available in this context.');
  });

  test('locks proxy should pass through method calls when locks are available', () => {
    const mockCallback = vi.fn();
    sdkNavigator.locks.request('test', mockCallback);
    expect(navigator.locks.request).toHaveBeenCalledWith('test', mockCallback);
  });

  test('should only expose expected Navigator properties', () => {
    const sdkNavigatorKeys = Object.keys(sdkNavigator);
    const navigatorKeys = Object.keys(navigator);
    sdkNavigatorKeys.forEach(key => {
      expect(navigatorKeys).toContain(key);
    });
  });
});
