import {
  DatabasePluginContext,
  LogLevels,
  PowerSyncLogger,
  WatchedQueryHooks,
  WatchedQueryPlugin,
  WatchedQueryPluginContext
} from '@powersync/common';

/**
 * Owns the registered plugins and the fail-safe boundary around every call into them.
 *
 * Lifecycle: constructed with the database (cheap, touches nothing), `open()`ed from
 * `initialize()` once the database is ready — NEVER from a constructor, where subclass
 * fields of the database are not yet assigned — and `dispose()`d on close.
 *
 * @internal
 */
export interface ActiveQueryHooks {
  pluginId: string;
  hooks: WatchedQueryHooks;
}

/** Per-plugin-id shallow merge; the second argument (watch-level) wins. */
export function mergeExtensions(
  base: Record<string, unknown> | undefined,
  override: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!base && !override) {
    return undefined;
  }
  return { ...base, ...override };
}

export class WatchedQueryPluginRegistry {
  private readonly plugins: WatchedQueryPlugin[];
  private readonly detached = new Set<string>();
  private readonly disposers: Array<() => void | Promise<void>> = [];
  private _isOpen = false;

  constructor(
    plugins: WatchedQueryPlugin[],
    private readonly logger: PowerSyncLogger
  ) {
    const seen = new Set<string>();
    for (const plugin of plugins) {
      if (seen.has(plugin.id)) {
        throw new Error(`Duplicate watched-query plugin id: ${plugin.id}`);
      }
      seen.add(plugin.id);
    }
    this.plugins = [...plugins];
  }

  get isOpen(): boolean {
    return this._isOpen;
  }

  get hasPlugins(): boolean {
    return this.plugins.length > 0;
  }

  open(context: DatabasePluginContext): void {
    if (this._isOpen) {
      return;
    }
    this._isOpen = true;
    for (const plugin of this.plugins) {
      try {
        const disposer = plugin.onDatabaseOpen?.(context);
        if (disposer) {
          this.disposers.push(disposer);
        }
      } catch (error) {
        this.detach(plugin.id, 'onDatabaseOpen', error);
      }
    }
  }

  async dispose(): Promise<void> {
    for (const disposer of this.disposers.splice(0)) {
      try {
        await disposer();
      } catch (error) {
        this.logger.log({ level: LogLevels.warn, message: 'Watched-query plugin disposer failed.', error });
      }
    }
    this._isOpen = false;
  }

  /** Creates this query's hooks from every attached plugin, in registration order. */
  createHooks(context: WatchedQueryPluginContext): ActiveQueryHooks[] {
    const active: ActiveQueryHooks[] = [];
    for (const plugin of this.plugins) {
      if (this.detached.has(plugin.id)) {
        continue;
      }
      try {
        const hooks = plugin.onWatchedQueryCreate?.({
          ...context,
          extensionOptions: context.extensions?.[plugin.id]
        });
        if (hooks) {
          active.push({ pluginId: plugin.id, hooks });
        }
      } catch (error) {
        this.detach(plugin.id, 'onWatchedQueryCreate', error);
      }
    }
    return active;
  }

  private detach(pluginId: string, hook: string, error: unknown): void {
    if (this.detached.has(pluginId)) {
      return;
    }
    this.detached.add(pluginId);
    this.logger.log({
      level: LogLevels.warn,
      message: `Watched-query plugin '${pluginId}' threw in ${hook} and has been detached.`,
      error
    });
  }
}
