import { WatchCompatibleQuery, createConsoleLogger, LogLevels } from '@powersync/common';
import { vi } from 'vitest';

/**
 * The minimal BasePowerSyncDatabase surface AbstractQueryProcessor touches, so the
 * processor can be exercised without SQLite. `pluginRegistry` is left undefined by
 * default — provenance must work with no plugin machinery at all.
 */
export function createTestProcessorHost(options?: { hasSynced?: boolean; ready?: boolean }) {
  const listeners = new Set<any>();
  let onChangeHandler: (() => Promise<void>) | undefined;

  const db = {
    logger: createConsoleLogger({ minLevel: LogLevels.error }),
    currentStatus: { hasSynced: options?.hasSynced ?? true },
    pluginRegistry: undefined as any,
    waitForReady: vi.fn(async () => {}),
    resolveTables: vi.fn(async () => ['items']),
    registerListener: (listener: any) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onChangeWithCallback: (handler: { onChange: () => Promise<void> }, opts: any) => {
      onChangeHandler = handler.onChange;
      if (opts?.triggerImmediate) {
        void handler.onChange();
      }
      return () => {};
    }
  };

  return {
    db,
    async emit() {
      await onChangeHandler?.();
    }
  };
}

export function createStubQuery<T>(sql: string, rows: () => T[] | Promise<T[]>): WatchCompatibleQuery<T[]> {
  return {
    compile: () => ({ sql, parameters: [] }),
    execute: async () => rows()
  };
}
