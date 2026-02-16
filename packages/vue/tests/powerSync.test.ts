import type { AbstractPowerSyncDatabase } from '@powersync/common';
import { describe, expect, it } from 'vitest';
import { createPowerSyncPlugin, usePowerSync } from '../src/composables/powerSync';
import { withSetup } from './utils';

describe('powerSync', () => {
  describe('usePowerSync', () => {
    it('should retrieve the PowerSync DB from the plugin', () => {
      const mockDb = { testText: 'Test Text' } as unknown as AbstractPowerSyncDatabase;

      const [powerSyncRef] = withSetup(
        () => usePowerSync(),
        (app) => {
          const { install } = createPowerSyncPlugin({ database: mockDb });
          install(app);
        }
      );

      expect(powerSyncRef).toBeDefined();
      expect((powerSyncRef?.value as any)?.testText).toBe('Test Text');
    });
  });
});
