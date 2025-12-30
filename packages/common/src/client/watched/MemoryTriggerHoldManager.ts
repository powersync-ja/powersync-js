import { TriggerHoldManager } from '../triggers/TriggerManager.js';

export class MemoryTriggerHoldManager implements TriggerHoldManager {
  // Uses a global store to share the state between potentially multiple instances
  private static HOLD_STORE = new Map<string, () => Promise<void>>();

  async obtainHold(identifier: string): Promise<() => Promise<void>> {
    if (MemoryTriggerHoldManager.HOLD_STORE.has(identifier)) {
      throw new Error(`A hold is already present for ${identifier}`);
    }
    const release = async () => {
      MemoryTriggerHoldManager.HOLD_STORE.delete(identifier);
    };
    MemoryTriggerHoldManager.HOLD_STORE.set(identifier, release);

    return release;
  }

  async checkHold(identifier: string): Promise<boolean> {
    return MemoryTriggerHoldManager.HOLD_STORE.has(identifier);
  }
}
