import { TriggerClaimManager } from '@powersync/common';
import { getNavigatorLocks } from '../shared/navigator.js';

/**
 * @internal
 * @experimental
 */
export const NAVIGATOR_TRIGGER_CLAIM_MANAGER: TriggerClaimManager = {
  async obtainClaim(identifier: string): Promise<() => Promise<void>> {
    return new Promise((resolveReleaser) => {
      getNavigatorLocks().request(identifier, async () => {
        await new Promise<void>((releaseLock) => {
          resolveReleaser(async () => releaseLock());
        });
      });
    });
  },

  async checkClaim(identifier: string): Promise<boolean> {
    const currentState = await getNavigatorLocks().query();
    return currentState.held?.find((heldLock) => heldLock.name == identifier) != null;
  }
};
