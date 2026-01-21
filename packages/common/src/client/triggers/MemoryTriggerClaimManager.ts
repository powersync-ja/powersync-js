import { TriggerClaimManager } from './TriggerManager.js';

// Uses a global store to share the state between potentially multiple instances
const CLAIM_STORE = new Map<string, () => Promise<void>>();

/**
 * @internal
 * @experimental
 */
export const MEMORY_TRIGGER_CLAIM_MANAGER: TriggerClaimManager = {
  async obtainClaim(identifier: string): Promise<() => Promise<void>> {
    if (CLAIM_STORE.has(identifier)) {
      throw new Error(`A claim is already present for ${identifier}`);
    }
    const release = async () => {
      CLAIM_STORE.delete(identifier);
    };
    CLAIM_STORE.set(identifier, release);

    return release;
  },

  async checkClaim(identifier: string): Promise<boolean> {
    return CLAIM_STORE.has(identifier);
  }
};
