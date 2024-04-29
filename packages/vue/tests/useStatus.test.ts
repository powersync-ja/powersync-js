import { describe, it, expect, vi } from 'vitest';
import { useStatus } from '../src/composables/useStatus';
import { withSetup } from './utils';
import * as PowerSync from '../src/composables/powerSync';
import { ref } from 'vue';

const mockPowerSync = {
  currentStatus: { connected: true },
  registerListener: vi.fn()
};

describe('useStatus', () => {
  it('should load the status of PowerSync', async () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync) as any);

    const [result] = withSetup(() => useStatus());
    expect(result!.status.value.connected).toBe(true);
  });

  it('should run the listener on unmount', () => {
    vi.spyOn(PowerSync, 'usePowerSync').mockReturnValue(ref(mockPowerSync as any));

    const [, app] = withSetup(() => useStatus());
    const listenerUnsubscribe = mockPowerSync.registerListener;

    app.unmount();

    expect(listenerUnsubscribe).toHaveBeenCalled();
  });
});
