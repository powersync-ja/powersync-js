import { createConsoleLogger, LogLevels, SeededResult, WatchedQueryPlugin } from '@powersync/common';
import { describe, expect, it, vi } from 'vitest';
import { WatchedQueryPluginRegistry } from '../../../src/client/plugins/WatchedQueryPluginRegistry.js';
import { DifferentialQueryProcessor } from '../../../src/client/watched/DifferentialQueryProcessor.js';
import { OnChangeQueryProcessor } from '../../../src/client/watched/OnChangeQueryProcessor.js';
import { createStubQuery, createTestProcessorHost } from './harness.js';

const logger = createConsoleLogger({ minLevel: LogLevels.error });

function openRegistry(...plugins: WatchedQueryPlugin[]) {
  const registry = new WatchedQueryPluginRegistry(plugins, logger);
  registry.open({ db: {} as any, logger });
  return registry;
}

const seeded = (data: unknown[], source = 'cache'): SeededResult => ({ data, source, sourceMeta: { tag: source } });

describe('plugin hook dispatch', () => {
  it('paints a synchronous seedInitial in the initial state', async () => {
    const { db } = createTestProcessorHost();
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({ seedInitial: () => seeded([{ id: 'seeded' }]) })
    });

    // Created up front (not inside `execute`) so the resolver is stable regardless of
    // when the async query-execution path actually invokes `execute` relative to this
    // test's own synchronous setup — `execute` may run several microtask turns after
    // construction, behind `db.waitForReady()` / `db.resolveTables()`.
    let resolveLive: (rows: unknown[]) => void = () => {};
    const livePromise = new Promise<unknown[]>((r) => (resolveLive = r));
    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: {
        query: { compile: () => ({ sql: 'S', parameters: [] }), execute: () => livePromise }
      }
    });

    // Same tick: the state already carries the seed.
    expect(processor.state.data).toEqual([{ id: 'seeded' }]);
    expect(processor.state.source).toBe('cache');
    expect(processor.state.sourceMeta).toEqual({ tag: 'cache' });
    expect(processor.state.isLoading).toBe(false);
    expect(processor.state.isFetching).toBe(true);

    resolveLive([{ id: 'live' }]);
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));
    expect(processor.state.data).toEqual([{ id: 'live' }]);
    expect(processor.state.sourceMeta).toBeNull();
    await processor.close();
  });

  it('first seedInitial in registration order wins', () => {
    const { db } = createTestProcessorHost();
    db.pluginRegistry = openRegistry(
      { id: 'a', onWatchedQueryCreate: () => ({ seedInitial: () => seeded([{ from: 'a' }], 'a') }) },
      { id: 'b', onWatchedQueryCreate: () => ({ seedInitial: () => seeded([{ from: 'b' }], 'b') }) }
    );

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => new Promise<never>(() => {}) as any) }
    });

    expect(processor.state.source).toBe('a');
    void processor.close();
  });

  it('adopts an onLink seed before live, and reports adoption', async () => {
    const { db } = createTestProcessorHost();
    let seedFn: ((r: SeededResult) => boolean) | undefined;
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({ onLink: (seed) => (seedFn = seed) })
    });

    let resolveLive: (rows: unknown[]) => void = () => {};
    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: {
        query: { compile: () => ({ sql: 'S', parameters: [] }), execute: () => new Promise((r) => (resolveLive = r)) }
      }
    });

    await vi.waitFor(() => expect(seedFn).toBeDefined());
    expect(seedFn!(seeded([{ id: 'hydrated' }]))).toBe(true);
    expect(processor.state.data).toEqual([{ id: 'hydrated' }]);
    expect(processor.state.source).toBe('cache');

    resolveLive([{ id: 'live' }]);
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));
    await processor.close();
  });

  it('rejects a seed after live data arrived', async () => {
    const { db } = createTestProcessorHost();
    let seedFn: ((r: SeededResult) => boolean) | undefined;
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({ onLink: (seed) => (seedFn = seed) })
    });

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => [{ id: 'live' }]) }
    });

    await vi.waitFor(() => expect(processor.state.source).toBe('live'));
    expect(seedFn!(seeded([{ id: 'stale' }]))).toBe(false);
    expect(processor.state.data).toEqual([{ id: 'live' }]);
    await processor.close();
  });

  it('rejects a seed after close, and the signal aborts', async () => {
    const { db } = createTestProcessorHost();
    let seedFn: ((r: SeededResult) => boolean) | undefined;
    let linkSignal: AbortSignal | undefined;
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({
        onLink: (seed, signal) => {
          seedFn = seed;
          linkSignal = signal;
        }
      })
    });

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => new Promise<never>(() => {}) as any) }
    });

    await vi.waitFor(() => expect(seedFn).toBeDefined());
    await processor.close();

    expect(linkSignal!.aborted).toBe(true);
    expect(seedFn!(seeded([{ id: 'late' }]))).toBe(false);
  });

  it('fans out onResult to every plugin with sync info', async () => {
    const { db } = createTestProcessorHost({ hasSynced: false });
    const results: unknown[] = [];
    db.pluginRegistry = openRegistry(
      { id: 'a', onWatchedQueryCreate: () => ({ onResult: (rows, info) => results.push(['a', rows, info.hasSynced]) }) },
      { id: 'b', onWatchedQueryCreate: () => ({ onResult: (rows, info) => results.push(['b', rows, info.hasSynced]) }) }
    );

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => [{ id: 1 }]) }
    });

    await vi.waitFor(() => expect(results).toHaveLength(2));
    expect(results[0]).toEqual(['a', [{ id: 1 }], false]);
    expect(results[1]).toEqual(['b', [{ id: 1 }], false]);
    await processor.close();
  });

  it('a throwing onResult does not break the query or other plugins', async () => {
    const { db } = createTestProcessorHost();
    const ok = vi.fn();
    db.pluginRegistry = openRegistry(
      {
        id: 'broken',
        onWatchedQueryCreate: () => ({
          onResult: () => {
            throw new Error('boom');
          }
        })
      },
      { id: 'ok', onWatchedQueryCreate: () => ({ onResult: ok }) }
    );

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => [{ id: 1 }]) }
    });

    await vi.waitFor(() => expect(processor.state.source).toBe('live'));
    expect(ok).toHaveBeenCalled();
    await processor.close();
  });

  it('updateSettings disposes hooks and recreates them with the new context', async () => {
    const { db } = createTestProcessorHost();
    const disposed = vi.fn();
    const contexts: string[] = [];
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: (ctx) => {
        contexts.push(ctx.signature);
        return { onDispose: disposed };
      }
    });

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('SELECT a', () => [1]) }
    });
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));

    await processor.updateSettings({ query: createStubQuery('SELECT b', () => [2]) });
    await vi.waitFor(() => expect(contexts).toHaveLength(2));

    expect(disposed).toHaveBeenCalledTimes(1);
    expect(contexts[0]).toContain('SELECT a');
    expect(contexts[1]).toContain('SELECT b');
    await processor.close();
  });

  it('defers hook creation until the registry opens (pre-ready query)', async () => {
    const { db } = createTestProcessorHost();
    const registry = new WatchedQueryPluginRegistry(
      [{ id: 'cache', onWatchedQueryCreate: () => ({ seedInitial: () => seeded([{ id: 'deferred' }]) }) }],
      logger
    );
    db.pluginRegistry = registry; // NOT opened yet — database still initializing.

    let resolveReady: () => void = () => {};
    db.waitForReady = vi.fn(() => new Promise<void>((r) => (resolveReady = r)));

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => new Promise<never>(() => {}) as any) }
    });

    // No sync paint — the registry was closed at construction.
    expect(processor.state.source).toBe('placeholder');

    registry.open({ db: {} as any, logger });
    resolveReady();

    // The deferred seedInitial flows through the guarded async path.
    await vi.waitFor(() => expect(processor.state.source).toBe('cache'));
    expect(processor.state.data).toEqual([{ id: 'deferred' }]);
    await processor.close();
  });

  it('a schemaChanged-style re-link (same settings object) still rebinds onLink hooks', async () => {
    const { db } = createTestProcessorHost();
    let onLinkCount = 0;
    let latestSeed: ((r: SeededResult) => boolean) | undefined;
    let latestSignal: AbortSignal | undefined;
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({
        onLink: (seed, signal) => {
          onLinkCount++;
          latestSeed = seed;
          latestSignal = signal;
        }
      })
    });

    let n = 0;
    // Distinguishable per-call result, so we can tell the second generation's live data
    // has actually landed (rather than just observing the stale 'live' source from before).
    const watchOptions = { query: createStubQuery('S', () => [{ id: 'live', n: ++n }]) };
    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions
    });

    await vi.waitFor(() => expect(processor.state.data).toEqual([{ id: 'live', n: 1 }]));
    expect(onLinkCount).toBe(1);

    // AbstractQueryProcessor's own `schemaChanged` listener re-links via
    // `this.updateSettings(this.options.watchOptions)` — the exact same settings object,
    // not a new one. Simulate that here directly.
    await processor.updateSettings(watchOptions);

    // A NEW onLink registration must have occurred despite the identical settings object.
    await vi.waitFor(() => expect(onLinkCount).toBe(2));
    // The new signal (from updateSettings' fresh abortController) must not be aborted.
    expect(latestSignal!.aborted).toBe(false);

    // Once this generation's live data has landed, a seed via the NEW callback is
    // rejected — specifically because live data exists, not because of an aborted signal.
    await vi.waitFor(() => expect(processor.state.data).toEqual([{ id: 'live', n: 2 }]));
    expect(latestSeed!(seeded([{ id: 'stale' }]))).toBe(false);
    expect(latestSignal!.aborted).toBe(false);

    await processor.close();
  });

  it('transitions off a seed even when a comparator calls the live result unchanged', async () => {
    // Regression: the onChange processor only assigned `data` when the comparator
    // reported a change. A plugin seed whose rows equal the first live result then left
    // the query stranded on `source: 'cache'` — no data assignment, so no live result
    // was ever recorded and `onResult` never fired.
    const { db } = createTestProcessorHost();
    const results: unknown[] = [];
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({
        seedInitial: () => seeded([{ id: 'a' }]),
        onResult: (rows) => void results.push(rows)
      })
    });

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      // A comparator that considers every result equal to the previous one.
      comparator: { checkEquality: () => true },
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => [{ id: 'a' }]) }
    });

    expect(processor.state.source).toBe('cache');
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));
    expect(processor.state.data).toEqual([{ id: 'a' }]);
    expect(processor.state.sourceMeta).toBeNull();
    // The live result reached the plugin too.
    await vi.waitFor(() => expect(results).toEqual([[{ id: 'a' }]]));
    await processor.close();
  });

  it('a late async seed cannot overwrite the synchronous seed already painted', async () => {
    // Regression: `constructInitialState` painted the sync seed without arming the
    // adopted-seed guard, so a slower plugin read resolving afterwards overwrote newer
    // rows with older ones.
    const { db } = createTestProcessorHost();
    let seedFn: ((r: SeededResult) => boolean) | undefined;
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({
        seedInitial: () => seeded([{ id: 'sync' }], 'sync'),
        onLink: (seed) => (seedFn = seed)
      })
    });

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => new Promise<never>(() => {}) as any) }
    });

    expect(processor.state.data).toEqual([{ id: 'sync' }]);
    await vi.waitFor(() => expect(seedFn).toBeDefined());

    expect(seedFn!(seeded([{ id: 'async' }], 'async'))).toBe(false);
    expect(processor.state.data).toEqual([{ id: 'sync' }]);
    expect(processor.state.source).toBe('sync');
    await processor.close();
  });

  it('a seed leaves isFetching alone when reportFetching is false', async () => {
    const { db } = createTestProcessorHost();
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({ seedInitial: () => seeded([{ id: 'a' }]) })
    });

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: {
        reportFetching: false,
        query: createStubQuery('S', () => new Promise<never>(() => {}) as any)
      }
    });

    // Previously hardcoded to true on the seed path, which left it stuck true forever
    // for a consumer that opted out of fetching reports.
    expect(processor.state.isFetching).toBe(false);
    await processor.close();
  });

  it('a same-signature re-link rebinds hooks without repainting cached data', async () => {
    // Regression: the re-link path reset the seeding guards unconditionally, so the
    // `schemaChanged` self-re-link (same settings object) re-consulted `seedInitial`
    // and painted stale cached rows back over live data already on screen.
    const { db } = createTestProcessorHost();
    let onLinkCount = 0;
    let seedInitialCalls = 0;
    let latestSeed: ((r: SeededResult) => boolean) | undefined;
    let latestSignal: AbortSignal | undefined;
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({
        seedInitial: () => {
          seedInitialCalls++;
          return seeded([{ id: 'cached' }]);
        },
        onLink: (seed, signal) => {
          onLinkCount++;
          latestSeed = seed;
          latestSignal = signal;
        }
      })
    });

    const watchOptions = { query: createStubQuery('S', () => [{ id: 'live' }]) };
    const processor = new OnChangeQueryProcessor<unknown[]>({ db: db as any, placeholderData: [], watchOptions });

    expect(processor.state.source).toBe('cache');
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));
    expect(seedInitialCalls).toBe(1);
    await vi.waitFor(() => expect(onLinkCount).toBe(1));

    // The same settings object, exactly as the schemaChanged listener re-links.
    await processor.updateSettings(watchOptions);

    // Hooks ARE rebound, with a fresh, non-aborted signal...
    await vi.waitFor(() => expect(onLinkCount).toBe(2));
    expect(latestSignal!.aborted).toBe(false);
    // ...but the guards stayed closed: same query signature, live data already on screen.
    expect(seedInitialCalls).toBe(1);
    expect(latestSeed!(seeded([{ id: 'stale' }]))).toBe(false);
    expect(processor.state.source).toBe('live');
    expect(processor.state.data).toEqual([{ id: 'live' }]);
    await processor.close();
  });

  it('a re-link for a DIFFERENT query does reopen the seeding guards', async () => {
    const { db } = createTestProcessorHost();
    const seedInitialSignatures: string[] = [];
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: (ctx) => ({
        seedInitial: () => {
          seedInitialSignatures.push(ctx.signature);
          return seeded([{ from: ctx.signature }]);
        }
      })
    });

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('SELECT a', () => [{ id: 'live-a' }]) }
    });
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));

    await processor.updateSettings({ query: createStubQuery('SELECT b', () => new Promise<never>(() => {}) as any) });

    await vi.waitFor(() => expect(seedInitialSignatures).toHaveLength(2));
    expect(seedInitialSignatures[1]).toContain('SELECT b');
    expect(processor.state.source).toBe('cache');
    expect(processor.state.data).toEqual([{ from: seedInitialSignatures[1] }]);
    await processor.close();
  });

  it('a plugin sees only its own extensionOptions', () => {
    const { db } = createTestProcessorHost();
    const seen: Record<string, unknown> = {};
    db.pluginRegistry = openRegistry(
      {
        id: 'a',
        onWatchedQueryCreate: (ctx) => {
          seen.a = ctx.extensionOptions;
          // There is no plugin-to-plugin channel on the context.
          expect('extensions' in ctx).toBe(false);
          return undefined;
        }
      },
      {
        id: 'b',
        onWatchedQueryCreate: (ctx) => {
          seen.b = ctx.extensionOptions;
          return undefined;
        }
      }
    );

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: {
        extensions: { a: { ttl: 1 }, b: false },
        query: createStubQuery('S', () => new Promise<never>(() => {}) as any)
      }
    });

    expect(seen).toEqual({ a: { ttl: 1 }, b: false });
    void processor.close();
  });

  it('re-merges definition-level extensions on every settings change', async () => {
    const { db } = createTestProcessorHost();
    const seen: unknown[] = [];
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: (ctx) => {
        seen.push(ctx.extensionOptions);
        return undefined;
      }
    });

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      defaultExtensions: { cache: { ttlMs: 5 } },
      watchOptions: { query: createStubQuery('SELECT a', () => [1]) }
    });
    await vi.waitFor(() => expect(processor.state.source).toBe('live'));
    expect(seen).toEqual([{ ttlMs: 5 }]);

    // A settings change carrying no extensions of its own must not drop the
    // definition's — `updateSettings` replaces watchOptions wholesale.
    await processor.updateSettings({ query: createStubQuery('SELECT b', () => [2]) });
    await vi.waitFor(() => expect(seen).toHaveLength(2));
    expect(seen[1]).toEqual({ ttlMs: 5 });

    // Watch-level options still win over the definition's.
    await processor.updateSettings({
      query: createStubQuery('SELECT c', () => [3]),
      extensions: { cache: false }
    });
    await vi.waitFor(() => expect(seen).toHaveLength(3));
    expect(seen[2]).toBe(false);
    await processor.close();
  });

  it('a seed whose adoption throws is rejected, not half-applied', async () => {
    const { db } = createTestProcessorHost();
    let seedFn: ((r: SeededResult) => boolean) | undefined;
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({ onLink: (seed) => (seedFn = seed) })
    });

    let boom = true;
    const processor = new DifferentialQueryProcessor<{ id: string }>({
      db: db as any,
      placeholderData: [],
      // `onSeededDataAdopted` reseeds the keyed snapshot through this user code.
      rowComparator: {
        keyBy: (item) => {
          if (boom) {
            throw new Error('comparator exploded');
          }
          return item.id;
        },
        compareBy: (item) => JSON.stringify(item)
      },
      watchOptions: { query: createStubQuery('S', () => new Promise<never>(() => {}) as any) }
    });

    await vi.waitFor(() => expect(seedFn).toBeDefined());
    expect(seedFn!(seeded([{ id: 'a' }]))).toBe(false);
    expect(processor.state.source).toBe('placeholder');
    expect(processor.state.data).toEqual([]);

    // The guard was released, so a later well-behaved seed is still accepted.
    boom = false;
    expect(seedFn!(seeded([{ id: 'b' }]))).toBe(true);
    expect(processor.state.source).toBe('cache');
    await processor.close();
  });

  it('first onLink seed adopted synchronously wins; a second is rejected', async () => {
    const { db } = createTestProcessorHost();
    db.pluginRegistry = openRegistry(
      {
        id: 'a',
        onWatchedQueryCreate: () => ({
          onLink: (seed) => {
            expect(seed(seeded([{ from: 'a' }], 'a'))).toBe(true);
          }
        })
      },
      {
        id: 'b',
        onWatchedQueryCreate: () => ({
          onLink: (seed) => {
            expect(seed(seeded([{ from: 'b' }], 'b'))).toBe(false);
          }
        })
      }
    );

    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions: { query: createStubQuery('S', () => new Promise<never>(() => {}) as any) }
    });

    await vi.waitFor(() => expect(processor.state.source).toBe('a'));
    expect(processor.state.data).toEqual([{ from: 'a' }]);
    await processor.close();
  });

  it('updateSettings racing init() keeps the close and schema listeners registered', async () => {
    // Regression: init()'s post-waitForReady guard treated a superseding
    // updateSettings() (signal aborted, query still open) like a close — it disposed
    // the closing listener and returned before ever registering the schemaChanged
    // listener. The queued updateSettingsInternal then linked the query normally, so
    // everything LOOKED fine, but db.close() no longer cascaded into the query and
    // schema changes silently stopped re-linking it, forever.
    const { db } = createTestProcessorHost();

    // Track which db listeners are currently registered (disposal removes them).
    const activeListeners = new Set<any>();
    const originalRegister = db.registerListener;
    db.registerListener = (listener: any) => {
      activeListeners.add(listener);
      const dispose = originalRegister(listener);
      return () => {
        activeListeners.delete(listener);
        dispose();
      };
    };

    // Hold init() suspended inside waitForReady so updateSettings can overtake it.
    let releaseReady: () => void = () => {};
    db.waitForReady = vi.fn(() => new Promise<void>((r) => (releaseReady = r)));

    let onLinkCount = 0;
    let latestSignal: AbortSignal | undefined;
    db.pluginRegistry = openRegistry({
      id: 'cache',
      onWatchedQueryCreate: () => ({
        onLink: (_seed, signal) => {
          onLinkCount++;
          latestSignal = signal;
        }
      })
    });

    let n = 0;
    const watchOptions = { query: createStubQuery('S', () => [{ id: 'live', n: ++n }]) };
    const processor = new OnChangeQueryProcessor<unknown[]>({
      db: db as any,
      placeholderData: [],
      watchOptions
    });

    // Supersede the initial generation while init() is still parked at waitForReady,
    // then let init() resume with an already-aborted signal.
    const settingsUpdated = processor.updateSettings(watchOptions);
    releaseReady();
    await settingsUpdated;

    // The queued generation owns linking: it must have linked once, with a live signal.
    await vi.waitFor(() => expect(processor.state.data).toEqual([{ id: 'live', n: 1 }]));
    expect(processor.state.source).toBe('live');
    expect(onLinkCount).toBe(1);
    expect(latestSignal!.aborted).toBe(false);

    // The schemaChanged listener must exist and still re-link the query.
    const schemaListeners = [...activeListeners].filter((l) => l.schemaChanged);
    expect(schemaListeners).toHaveLength(1);
    await schemaListeners[0].schemaChanged();
    await vi.waitFor(() => expect(onLinkCount).toBe(2));
    await vi.waitFor(() => expect(processor.state.data).toEqual([{ id: 'live', n: 2 }]));

    // The closing listener must exist and still cascade db.close() into the query.
    const closingListeners = [...activeListeners].filter((l) => l.closing);
    expect(closingListeners).toHaveLength(1);
    await closingListeners[0].closing();
    expect(processor.closed).toBe(true);
  });
});
