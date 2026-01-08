import { TriggerClaimManager } from './TriggerManager.js';

/**
 * @internal
 * @experimental
 */
export class MemoryTriggerClaimManager implements TriggerClaimManager {
  // Uses a global store to share the state between potentially multiple instances
  private static CLAIM_STORE = new Map<string, () => Promise<void>>();

  async obtainClaim(identifier: string): Promise<() => Promise<void>> {
    if (MemoryTriggerClaimManager.CLAIM_STORE.has(identifier)) {
      throw new Error(`A claim is already present for ${identifier}`);
    }
    const release = async () => {
      MemoryTriggerClaimManager.CLAIM_STORE.delete(identifier);
    };
    MemoryTriggerClaimManager.CLAIM_STORE.set(identifier, release);

    return release;
  }

  async checkClaim(identifier: string): Promise<boolean> {
    return MemoryTriggerClaimManager.CLAIM_STORE.has(identifier);
  }
}
