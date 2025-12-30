import { TriggerHoldManager } from '@powersync/common';
import { getNavigatorLocks } from '../shared/navigator';

export class NavigatorTriggerHoldManager implements TriggerHoldManager {
  async obtainHold(identifier: string): Promise<() => Promise<void>> {
    return new Promise((resolveReleaser) => {
      getNavigatorLocks().request(identifier, async () => {
        await new Promise<void>((releaseLock) => {
          resolveReleaser(async () => releaseLock());
        });
      });
    });
  }

  async checkHold(identifier: string): Promise<boolean> {
    const currentState = await getNavigatorLocks().query();
    return currentState.held?.find((heldLock) => heldLock.name == identifier) != null;
  }
}
