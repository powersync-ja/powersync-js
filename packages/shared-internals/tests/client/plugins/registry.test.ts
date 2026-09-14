import { createConsoleLogger, LogLevels, WatchedQueryPlugin } from '@powersync/common';
import { describe, expect, it, vi } from 'vitest';
import { WatchedQueryPluginRegistry } from '../../../src/client/plugins/WatchedQueryPluginRegistry.js';

const logger = createConsoleLogger({ minLevel: LogLevels.error });
const dbContext = { db: {} as any, logger };
const queryContext = (id = 'q') => ({
  signature: `SELECT ${id}\0[]`,
  compiled: { sql: `SELECT ${id}`, parameters: [] },
  dataIsArray: true,
  extensionOptions: undefined,
  db: {} as any
});

describe('WatchedQueryPluginRegistry', () => {
  it('is closed until open() and reports it', async () => {
    const registry = new WatchedQueryPluginRegistry([], logger);
    expect(registry.isOpen).toBe(false);
    registry.open(dbContext);
    expect(registry.isOpen).toBe(true);
    await registry.dispose();
  });

  it('calls onDatabaseOpen once per plugin and awaits disposers on dispose', async () => {
    const disposer = vi.fn();
    const onOpen = vi.fn(() => disposer);
    const registry = new WatchedQueryPluginRegistry([{ id: 'a', onDatabaseOpen: onOpen }], logger);

    registry.open(dbContext);
    expect(onOpen).toHaveBeenCalledTimes(1);

    await registry.dispose();
    expect(disposer).toHaveBeenCalledTimes(1);
  });

  it('creates hooks per plugin, preserving registration order', () => {
    const make = (id: string): WatchedQueryPlugin => ({
      id,
      onWatchedQueryCreate: () => ({ seedInitial: () => ({ data: [id], source: id }) })
    });
    const registry = new WatchedQueryPluginRegistry([make('first'), make('second')], logger);
    registry.open(dbContext);

    const hooks = registry.createHooks(queryContext());
    expect(hooks.map((h) => h.pluginId)).toEqual(['first', 'second']);
  });

  it('skips plugins that return undefined', () => {
    const registry = new WatchedQueryPluginRegistry(
      [{ id: 'ignores', onWatchedQueryCreate: () => undefined }, { id: 'none' }],
      logger
    );
    registry.open(dbContext);
    expect(registry.createHooks(queryContext())).toHaveLength(0);
  });

  it('detaches a plugin whose onWatchedQueryCreate throws, without affecting others', () => {
    const registry = new WatchedQueryPluginRegistry(
      [
        {
          id: 'broken',
          onWatchedQueryCreate: () => {
            throw new Error('boom');
          }
        },
        { id: 'ok', onWatchedQueryCreate: () => ({}) }
      ],
      logger
    );
    registry.open(dbContext);

    expect(() => registry.createHooks(queryContext())).not.toThrow();
    expect(registry.createHooks(queryContext()).map((h) => h.pluginId)).toEqual(['ok']);
  });

  it('rejects duplicate plugin ids', () => {
    expect(() => new WatchedQueryPluginRegistry([{ id: 'x' }, { id: 'x' }], logger)).toThrow(/duplicate/i);
  });

  it('a throwing onDatabaseOpen detaches that plugin entirely', () => {
    const registry = new WatchedQueryPluginRegistry(
      [
        {
          id: 'broken',
          onDatabaseOpen: () => {
            throw new Error('boom');
          },
          onWatchedQueryCreate: () => ({})
        }
      ],
      logger
    );
    expect(() => registry.open(dbContext)).not.toThrow();
    expect(registry.createHooks(queryContext())).toHaveLength(0);
  });

  it('hands each plugin only its own extension options', () => {
    const seen: Record<string, unknown> = {};
    const make = (id: string): WatchedQueryPlugin => ({
      id,
      onWatchedQueryCreate: (context) => {
        seen[id] = context.extensionOptions;
        return {};
      }
    });
    const registry = new WatchedQueryPluginRegistry([make('a'), make('b')], logger);
    registry.open(dbContext);

    registry.createHooks(queryContext(), { a: 1, b: { ttlMs: 5 }, c: 'not addressed to either' });
    expect(seen).toEqual({ a: 1, b: { ttlMs: 5 } });
  });

  it('dispose is terminal — a reopened registry stays closed', async () => {
    const onOpen = vi.fn();
    const registry = new WatchedQueryPluginRegistry([{ id: 'a', onDatabaseOpen: onOpen }], logger);

    registry.open(dbContext);
    await registry.dispose();
    expect(registry.isOpen).toBe(false);

    registry.open(dbContext);
    expect(registry.isOpen).toBe(false);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
