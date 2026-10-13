import { CommonPowerSyncDatabase } from '@powersync/common';
import { QueryConfig, QueryRunner, Result } from '../watched/QueryRunner.js';

/**
 * How long a query checked out by a render stays alive after it has loaded, if no component subscribes to it.
 *
 * React may take a while to commit a component after its suspending promise resolves (at least 300ms), so this should
 * be generous.
 */
export const TEMPORARY_HOLD_MS = 5_000;

/**
 * Shares {@link QueryRunner}s between suspending hooks.
 *
 * Components that suspend before their first commit lose all their state, so the runner for a query can't be stored
 * in the component. Instead, rendering checks out the entry for a query from this cache. Checking out an entry places a
 * temporary hold on it, which runs the query and keeps it alive until a component has committed and subscribed to it
 * (or until the hold expires, e.g. because the render was discarded).
 *
 * An entry is alive exactly while it is held or has subscribers, and the cache maps each query to at most one entry.
 * Hooks never reference entries directly, they use a {@link SuspenseQuery} handle that looks up the current entry for
 * its query (creating it if necessary) and then sticks to that entry while it's alive.
 *
 * Queries that only run once are shared only before they report results: We want a suspending hook to obtain the same
 * query when invoked again, without reporting stale results to from oneshot queries that already ran.
 */
class SuspenseQueryCache {
  private readonly entries = new Map<string, SuspenseQueryEntry<any>>();

  /**
   * Returns a handle for the given query. Creating handles has no side effects.
   */
  query<RowType>(key: string, config: QueryConfig<RowType>) {
    let entry: SuspenseQueryEntry<RowType> | null = null;
    const current = () => {
      if (entry == null || entry.isRemoved) {
        entry = this.entries.get(key) ?? this.checkOut(key, config);
      }
      return entry;
    };

    return {
      markUsed: () => {
        if (entry == null || entry.isRemoved) {
          entry = this.checkOut(key, config);
        } else {
          entry.ensureHeld();
        }
      },
      subscribe: (onChange: () => void): (() => void) => {
        return current().subscribe(onChange);
      },
      getSnapshot: (): Result<RowType> => {
        return current().getSnapshot();
      },
      waitForLoaded: (): Promise<void> => {
        return current().loaded;
      }
    };
  }

  /**
   * Returns the entry for the given query after placing a temporary hold on it, creating it if necessary.
   */
  private checkOut<RowType>(key: string, config: QueryConfig<RowType>): SuspenseQueryEntry<RowType> {
    let entry = this.entries.get(key) as SuspenseQueryEntry<RowType> | undefined;
    if (entry == null || entry.isOutdated) {
      const created: SuspenseQueryEntry<RowType> = new SuspenseQueryEntry(config, () => {
        // An outdated entry may have been replaced already, don't evict its replacement.
        if (this.entries.get(key) === created) {
          this.entries.delete(key);
        }
      });
      this.entries.set(key, created);
      entry = created;
    }

    entry.ensureHeld();
    return entry;
  }
}

class SuspenseQueryEntry<RowType> {
  private readonly runner = new QueryRunner<RowType>();
  /**
   * The number of subscribed components, not counting the temporary hold.
   */
  private subscribers = 0;
  private releaseHold: (() => void) | null = null;
  private holdTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingLoad: { promise: Promise<void>; resolve: () => void } | null = null;
  private readonly runOnce: boolean;
  /**
   * Set once this entry is neither held nor subscribed to. Its runner is idle then, and it must not be used again.
   */
  isRemoved = false;

  constructor(
    config: QueryConfig<RowType>,
    /**
     * Evicts this entry from the cache once it's removed.
     */
    private readonly onUnused: () => void
  ) {
    this.runOnce = config.runOnce;
    // We call configure once here, and then never again. A changed config is represented by a fresh query entry
    // (necessary to potentially re-use this across components).
    this.runner.configure(config);
  }

  /**
   * Whether a new checkout should create a fresh entry instead of sharing this one: For queries running once, the
   * result is only shared with components rendering while the initial hold is active. This avoids reporting stale data
   * after the initial load.
   */
  get isOutdated(): boolean {
    return this.runOnce && this.releaseHold == null && this.isSettled;
  }

  subscribe(onChange: () => void): () => void {
    this.subscribers++;
    // Note that we don't release the temporary hold here: In StrictMode, React unsubscribes and resubscribes right
    // away, which would otherwise dispose and restart the query. The hold expires on its own shortly after loading.
    const unsubscribe = this.runner.subscribe(() => {
      this.onRunnerChange();
      onChange();
    });

    return () => {
      unsubscribe();
      this.subscribers--;
      this.removeIfUnused();
    };
  }

  getSnapshot(): Result<RowType> {
    return this.runner.getSnapshot();
  }

  /**
   * A promise to throw while the query is loading. It's stable until the query has loaded, and resolves once the
   * query has a result or an error.
   */
  get loaded(): Promise<void> {
    if (this.isSettled) {
      return Promise.resolve();
    }

    if (this.pendingLoad == null) {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => (resolve = r));
      this.pendingLoad = { promise, resolve };
    }
    return this.pendingLoad.promise;
  }

  /**
   * Places a temporary hold on this entry for a render that checked it out, or extends the existing one.
   *
   * We do this even if components are subscribed already, since they might unsubscribe before the render checking
   * out this entry commits (e.g. when one component unmounts while another one using the same query mounts).
   */
  ensureHeld() {
    if (this.releaseHold == null) {
      // If this is the first listener, subscribing starts running the query. The runner then only notifies its own
      // listeners, which is just the hold. Otherwise, it doesn't notify anyone. So this is safe to call while rendering.
      this.releaseHold = this.runner.subscribe(() => this.onRunnerChange());
    } else if (this.holdTimeout != null) {
      // Restart the timer in onRunnerChange, so that the hold lasts until shortly after the latest checkout.
      clearTimeout(this.holdTimeout);
      this.holdTimeout = null;
    }

    this.onRunnerChange();
  }

  private get isSettled(): boolean {
    const snapshot = this.runner.getSnapshot();
    return !snapshot.isLoading || snapshot.error != null;
  }

  private onRunnerChange() {
    if (!this.isSettled) {
      return;
    }

    this.pendingLoad?.resolve();
    this.pendingLoad = null;

    if (this.releaseHold != null && this.holdTimeout == null) {
      this.holdTimeout = setTimeout(() => {
        this.holdTimeout = null;
        this.releaseHold?.();
        this.releaseHold = null;
        this.removeIfUnused();
      }, TEMPORARY_HOLD_MS);
    }
  }

  private removeIfUnused() {
    if (this.subscribers == 0 && this.releaseHold == null) {
      // The runner has disposed its work since it has no listeners left.
      this.isRemoved = true;
      this.onUnused();
    }
  }
}

let caches: WeakMap<CommonPowerSyncDatabase, SuspenseQueryCache> | undefined;

export function getSuspenseQueryCache(db: CommonPowerSyncDatabase): SuspenseQueryCache {
  caches ??= new WeakMap();
  let cache = caches.get(db);
  if (cache == null) {
    cache = new SuspenseQueryCache();
    caches.set(db, cache);
  }
  return cache;
}
