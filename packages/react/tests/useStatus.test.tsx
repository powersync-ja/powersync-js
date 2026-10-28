import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { vi, describe, expect, it, afterEach } from 'vitest';
import { useStatus, useStatusOrNull } from '../src/hooks/useStatus';
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
    const wrapper = ({ children }: { children: React.ReactNode }) => (
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

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PowerSyncContext.Provider value={mockPowerSyncInTest as any}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => useStatus(), { wrapper });

    act(() => {
      expect(result.current).toEqual({ status: 'updated' });
    });
  });

  it('should run the listener on unmount', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PowerSyncContext.Provider value={mockPowerSync as any}>{children}</PowerSyncContext.Provider>
    );

    const { unmount } = renderHook(() => useStatus(), { wrapper });
    const listenerUnsubscribe = callback;

    unmount();

    expect(listenerUnsubscribe).toHaveBeenCalled();
  });
});

describe('useStatusOrNull', () => {
  const createMockDb = (status: string) => {
    let listener: any;
    return {
      currentStatus: { status },
      registerListener: vi.fn((l) => {
        listener = l;
        return () => (listener = undefined);
      }),
      emit(newStatus: string) {
        this.currentStatus = { status: newStatus };
        listener?.statusChanged?.(this.currentStatus);
      }
    };
  };

  // renderHook doesn't pass props to the wrapper, so the wrapper reads the database from here.
  let contextDb: ReturnType<typeof createMockDb> | null = null;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PowerSyncContext.Provider value={contextDb as any}>{children}</PowerSyncContext.Provider>
  );

  it('should return null without a database', () => {
    const { result } = renderHook(() => useStatusOrNull());
    expect(result.current).toBeNull();
  });

  it('should report status updates', () => {
    const db = (contextDb = createMockDb('initial'));
    const { result } = renderHook(() => useStatusOrNull(), { wrapper });
    expect(result.current).toEqual({ status: 'initial' });

    act(() => db.emit('updated'));
    expect(result.current).toEqual({ status: 'updated' });
  });

  it('should immediately reflect context changes', () => {
    const dbA = createMockDb('a');
    const dbB = createMockDb('b');
    const seen: unknown[] = [];

    contextDb = dbA;
    const { rerender } = renderHook(
      () => {
        const status = useStatusOrNull();
        seen.push(status);
        return status;
      },
      { wrapper }
    );
    expect(seen.at(-1)).toEqual({ status: 'a' });

    seen.length = 0;
    contextDb = null;
    rerender();
    // No render may observe the previous database's status.
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((s) => s === null)).toBe(true);

    seen.length = 0;
    contextDb = dbB;
    rerender();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((s) => (s as any)?.status === 'b')).toBe(true);

    // Updates from the old database must be ignored.
    act(() => dbA.emit('stale'));
    expect(seen.at(-1)).toEqual({ status: 'b' });
  });
});
