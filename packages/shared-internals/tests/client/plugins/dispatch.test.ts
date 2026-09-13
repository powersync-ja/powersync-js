import { createConsoleLogger, LogLevels, SeededResult, WatchedQueryPlugin } from '@powersync/common';
import { describe, expect, it, vi } from 'vitest';
import { WatchedQueryPluginRegistry } from '../../../src/client/plugins/WatchedQueryPluginRegistry.js';
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
});
