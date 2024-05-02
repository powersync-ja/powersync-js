import { describe, it, expect, vi, afterEach } from 'vitest';
import { useStatus } from '../src/composables/useStatus';
import { withSetup } from './utils';
import * as PowerSync from '../src/composables/powerSync';
import { ref } from 'vue';

const cleanupListener = vi.fn();

const mockPowerSync = {
  currentStatus: { connected: true },
  registerListener: () => cleanupListener
};

describe('useStatus', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should load the status of PowerSync', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);

    const [status] = withSetup(() => useStatus());
    expect(status.value.connected).toBe(true);
  });

  it('should run the listener cleanup on unmount', () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync as any));

    const [, app] = withSetup(() => useStatus());
    const listenerUnsubscribe = cleanupListener;

    app.unmount();

    expect(listenerUnsubscribe).toHaveBeenCalled();
  });
});
