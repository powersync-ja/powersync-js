import { describe, expect, it } from 'vitest';
import type { SeededResult, WatchedQueryPlugin } from '../../src/client/plugins/WatchedQueryPlugin.js';

describe('plugin contract', () => {
  it('a minimal plugin type-checks', () => {
    const plugin: WatchedQueryPlugin = { id: 'noop' };
    expect(plugin.id).toBe('noop');
  });

  it('a seeding plugin type-checks end to end', () => {
    const seeded: SeededResult = { data: [{ id: 1 }], source: 'cache', sourceMeta: { cachedAt: new Date() } };
    const plugin: WatchedQueryPlugin = {
      id: 'cache',
      onWatchedQueryCreate: (ctx) =>
        ctx.dataIsArray
          ? {
              seedInitial: () => seeded,
              onLink: (seed) => void seed(seeded),
              onResult: (_rows, info) => void info.hasSynced,
              onDispose: () => {}
            }
          : undefined
    };
    expect(plugin.onWatchedQueryCreate).toBeTypeOf('function');
  });
});
