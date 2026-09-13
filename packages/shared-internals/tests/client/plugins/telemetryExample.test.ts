import { createConsoleLogger, LogLevels, WatchedQueryPlugin } from '@powersync/common';
import { describe, expect, it, vi } from 'vitest';
import { WatchedQueryPluginRegistry } from '../../../src/client/plugins/WatchedQueryPluginRegistry.js';
import { OnChangeQueryProcessor } from '../../../src/client/watched/OnChangeQueryProcessor.js';
import { createStubQuery, createTestProcessorHost } from './harness.js';

const logger = createConsoleLogger({ minLevel: LogLevels.error });

interface QueryTelemetryEvent {
  signature: string;
  timeToFirstResultMs?: number;
  rowCount?: number;
  hasSynced?: boolean | undefined;
  disposedAfterMs?: number;
}

// The example from the API spec, verbatim in spirit — if this stops compiling or
// passing, the API broke its second consumer.
function queryTelemetryPlugin(report: (e: QueryTelemetryEvent) => void): WatchedQueryPlugin {
  return {
    id: 'telemetry',
    onWatchedQueryCreate(ctx) {
      const startedAt = Date.now();
      let firstResultAt: number | undefined;
      return {
        onResult(rows, info) {
          firstResultAt ??= Date.now();
          report({
            signature: ctx.signature,
            timeToFirstResultMs: firstResultAt - startedAt,
            rowCount: info.dataIsArray ? (rows as unknown[]).length : undefined,
            hasSynced: info.hasSynced
          });
        },
        onDispose: () => report({ signature: ctx.signature, disposedAfterMs: Date.now() - startedAt })
      };
    }
  };
}

describe('telemetry example plugin', () => {
  it('observes results and disposal without seeding anything', async () => {
    const events: QueryTelemetryEvent[] = [];
    const { db } = createTestProcessorHost({ hasSynced: true });
    const registry = new WatchedQueryPluginRegistry([queryTelemetryPlugin((e) => events.push(e))], logger);
    registry.open({ db: {} as any, logger });
    db.pluginRegistry = registry;

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('SELECT * FROM items', () => [{ id: 1 }, { id: 2 }]) }
    });

    await vi.waitFor(() => expect(events).toHaveLength(1));
    expect(events[0].rowCount).toBe(2);
    expect(events[0].hasSynced).toBe(true);
    expect(events[0].signature).toContain('SELECT * FROM items');
    // Observation must not perturb the state machine.
    expect(processor.state.source).toBe('live');

    await processor.close();
    await vi.waitFor(() => expect(events).toHaveLength(2));
    expect(events[1].disposedAfterMs).toBeGreaterThanOrEqual(0);
  });
});
