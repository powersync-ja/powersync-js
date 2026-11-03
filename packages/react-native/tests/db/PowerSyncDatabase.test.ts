import { describe, expect, it, vi } from 'vitest';

// Simulate Expo Go: the native op-sqlite module is not available, so loading
// `@op-engineering/op-sqlite` throws at module-init time.
vi.mock('@op-engineering/op-sqlite', () => {
  throw new Error('Base module not found. Did you do a pod install/clear the gradle cache?');
});

describe('PowerSyncDatabase', () => {
  it('can be imported without loading op-sqlite (Expo Go)', async () => {
    const module = await import('../../src');
    expect(module.PowerSyncDatabase).toBeDefined();
  });
});
