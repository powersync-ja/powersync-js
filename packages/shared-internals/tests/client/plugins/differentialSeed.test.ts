import { createConsoleLogger, LogLevels, WatchedQueryDifferential } from '@powersync/common';
import { describe, expect, it, vi } from 'vitest';
import { WatchedQueryPluginRegistry } from '../../../src/client/plugins/WatchedQueryPluginRegistry.js';
import { DifferentialQueryProcessor } from '../../../src/client/watched/DifferentialQueryProcessor.js';
import { createStubQuery, createTestProcessorHost } from './harness.js';

const logger = createConsoleLogger({ minLevel: LogLevels.error });

describe('differential processor with a plugin seed', () => {
  it('diffs the first live result against seeded rows, not against empty', async () => {
    const { db } = createTestProcessorHost();
    const registry = new WatchedQueryPluginRegistry(
      [
        {
          id: 'cache',
          onWatchedQueryCreate: () => ({
            seedInitial: () => ({ data: [{ id: 'a', name: 'A' }], source: 'cache' })
          })
        }
      ],
      logger
    );
    registry.open({ db: {} as any, logger });
    db.pluginRegistry = registry;

    const processor = new DifferentialQueryProcessor<{ id: string; name: string }>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('SELECT * FROM items', () => [{ id: 'a', name: 'A' }]) }
    });

    const diffs: WatchedQueryDifferential<{ id: string; name: string }>[] = [];
    processor.registerListener({ onDiff: (diff) => void diffs.push(diff) });

    expect(processor.state.source).toBe('cache');
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));

    expect(diffs.flatMap((d) => d.added)).toHaveLength(0);
    expect(processor.state.data).toEqual([{ id: 'a', name: 'A' }]);
    await processor.close();
  });

  it('preserves no-churn contract after first live result (regression test)', async () => {
    const { db, emit } = createTestProcessorHost();
    const registry = new WatchedQueryPluginRegistry(
      [
        {
          id: 'cache',
          onWatchedQueryCreate: () => ({
            seedInitial: () => ({ data: [{ id: 'a', name: 'A' }], source: 'cache' })
          })
        }
      ],
      logger
    );
    registry.open({ db: {} as any, logger });
    db.pluginRegistry = registry;

    const processor = new DifferentialQueryProcessor<{ id: string; name: string }>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('SELECT * FROM items', () => [{ id: 'a', name: 'A' }]) }
    });

    // Wait for processor to reach 'live' and settle
    processor.registerListener({ onDiff: () => {} });
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));
    await vi.waitFor(() => expect(processor.state.isFetching).toBe(false));

    // Store the initial data reference after reaching 'live'
    const dataAtLive = processor.state.data;

    // Register onData listener with counter AFTER reaching 'live' and settled
    let onDataCount = 0;
    processor.registerListener({
      onData: () => {
        onDataCount++;
      }
    });

    // Emit two more ticks with the SAME rows (no changes)
    await emit();
    await emit();

    // Assert no-churn contract: onData not called (data unchanged) and array reference same
    expect(onDataCount).toBe(0);
    expect(processor.state.data).toBe(dataAtLive); // Same array reference (not replaced)
    expect(processor.state.data).toEqual([{ id: 'a', name: 'A' }]); // Content still correct

    await processor.close();
  });
});
