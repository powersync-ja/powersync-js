import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { vi, describe, expect, it, afterEach } from 'vitest';
import { useStatus } from '../src/hooks/useStatus';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';

const callback = vi.fn();

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: () => callback
};

vi.mock('./PowerSyncContext', () => ({
  useContext: vi.fn(() => mockPowerSync)
}));

describe('useStatus', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with the current status', () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useStatus(), { wrapper });
    expect(result.current).toEqual(mockPowerSync.currentStatus);
  });

  // TODO: Get this test to work
  it.skip('should update the status when the listener is called', () => {
    const mockPowerSyncInTest = {
      currentStatus: { status: 'initial' },
      registerListener: vi.fn(() => {})
    };

    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSyncInTest as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useStatus(), { wrapper });

    act(() => {
      expect(result.current).toEqual({ status: 'updated' });
    });
  });

  it('should run the listener on unmount', () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { unmount } = renderHook(() => useStatus(), { wrapper });
    const listenerUnsubscribe = callback;

    unmount();

    expect(listenerUnsubscribe).toHaveBeenCalled();
  });
});
