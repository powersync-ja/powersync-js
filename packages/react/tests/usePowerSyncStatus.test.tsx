import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePowerSyncStatus } from '../src/hooks/deprecated/usePowerSyncStatus';
import { useStatus } from '../src/hooks/useStatus';
import { PowerSyncContext } from '../src/hooks/PowerSyncContext';
import { openPowerSync } from './utils';

describe('usePowerSyncStatus without a provider', () => {
  it('should not throw and should return undefined when there is no PowerSyncContext.Provider', () => {
    const { result } = renderHook(() => usePowerSyncStatus());
    expect(result.current).toBeUndefined();
  });

  it('useStatus should not throw when there is no PowerSyncContext.Provider', () => {
    const { result } = renderHook(() => useStatus());
    expect(result.current).toBeUndefined();
  });

  it('should still return the real status when a provider is present', async () => {
    const db = openPowerSync();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
    );

    const { result } = renderHook(() => usePowerSyncStatus(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBe(db.currentStatus);
    });
  });
});
