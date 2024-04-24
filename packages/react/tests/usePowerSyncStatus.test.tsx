import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { vi, describe, expect, it, afterEach } from 'vitest';
import { usePowerSyncStatus } from '../src/hooks/usePowerSyncStatus';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => ({
    statusChanged: vi.fn(() => 'updated')
  }))
};

vi.mock('./PowerSyncContext', () => ({
  useContext: vi.fn(() => mockPowerSync)
}));

describe('usePowerSyncStatus', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with the current status', () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => usePowerSyncStatus(), { wrapper });
    expect(result.current).toEqual(mockPowerSync.currentStatus);
  });

  // TODO: Get this test to work
  it.skip('should update the status when the listener is called', () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => usePowerSyncStatus(), { wrapper });

    act(() => {
      mockPowerSync.registerListener.mockResolvedValue({ statusChanged: vi.fn(() => 'updated') });
    });

    expect(result.current).toEqual({ status: 'updated' });
  });

  it('should run the listener on unmount', () => {
    const wrapper = ({ children }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { unmount } = renderHook(() => usePowerSyncStatus(), { wrapper });
    const listenerUnsubscribe = mockPowerSync.registerListener;

    unmount();

    expect(listenerUnsubscribe).toHaveBeenCalled();
  });
});
