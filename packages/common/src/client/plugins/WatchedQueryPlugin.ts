import { CompiledQuery } from '../../types/types.js';
import { PowerSyncLogger } from '../../utils/Logger.js';
import { CommonPowerSyncDatabase } from '../CommonPowerSyncDatabase.js';

/**
 * A plugin extending PowerSync watched-query behaviour.
 *
 * @alpha
 */
export interface WatchedQueryPlugin {
  /** Unique id. Also the key under which per-query extension options are addressed. */
  readonly id: string;

  /**
   * Called once when the database becomes ready. Returns an optional disposer,
   * invoked when the database closes.
   */
  onDatabaseOpen?(context: DatabasePluginContext): void | (() => void | Promise<void>);

  /**
   * Called for every watched query as it is constructed. Return hooks to participate
   * in that query's lifecycle, or undefined to ignore it.
   */
  onWatchedQueryCreate?(context: WatchedQueryPluginContext): WatchedQueryHooks | undefined;
}

/**
 * @alpha
 */
export interface DatabasePluginContext {
  readonly db: CommonPowerSyncDatabase;
  readonly logger: PowerSyncLogger;
}

/**
 * @alpha
 */
export interface WatchedQueryPluginContext {
  /** `sql` + NUL + serialized parameters. Stable identity for the query. */
  readonly signature: string;
  readonly compiled: CompiledQuery;
  /**
   * Whether this query's result type is an array of rows. False for the legacy
   * `watch(sql)` API, whose `QueryResult` carries non-serializable accessors —
   * plugins that seed or persist data should return undefined when this is false.
   */
  readonly dataIsArray: boolean;
  /** The value under `extensions[plugin.id]` in the query's options, if any. */
  readonly extensionOptions: unknown;
  /** The full merged per-query extensions record. Prefer {@link extensionOptions}. */
  readonly extensions?: Record<string, unknown>;
  readonly db: CommonPowerSyncDatabase;
}

/**
 * Data injected by a plugin in place of (or ahead of) a live result.
 *
 * @alpha
 */
export interface SeededResult {
  data: readonly unknown[];
  /** Provenance tag surfaced as {@link WatchedQueryState.source}, e.g. 'cache'. */
  source: string;
  /** Plugin-defined detail surfaced as {@link WatchedQueryState.sourceMeta}. */
  sourceMeta?: unknown;
}

/**
 * Per-watched-query hooks. All optional; every callback is wrapped — a throwing
 * plugin is logged and detached, never propagated into the query.
 *
 * @alpha
 */
export interface WatchedQueryHooks {
  /**
   * Synchronous seed, consulted while the query's initial state is built. First
   * plugin (registration order) returning a value wins. Must be fast — it runs on
   * the construction path.
   */
  seedInitial?(): SeededResult | undefined;

  /**
   * Asynchronous seed. `seed()` returns true if the result was adopted — core
   * rejects it once a live result has arrived, after disposal, or after a settings
   * change (the signal aborts in all three cases). Runs in parallel with query
   * initialisation; never delays it.
   */
  onLink?(seed: (result: SeededResult) => boolean, signal: AbortSignal): void;

  /**
   * Observes every live emission, after state has updated.
   */
  onResult?(rows: unknown, info: LiveResultInfo): void;

  /** The watched query closed or its settings changed (hooks are re-created after). */
  onDispose?(): void;
}

/**
 * @alpha
 */
export interface LiveResultInfo {
  /** Whether the database has completed at least one full sync. */
  readonly hasSynced: boolean | undefined;
  /** True when the emission is an array of rows (see dataIsArray). */
  readonly dataIsArray: boolean;
}
