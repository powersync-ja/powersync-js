import {
  CommonPowerSyncDatabase,
  DifferentialWatchedQuery,
  DifferentialWatchedQueryComparator,
  WatchedQueryState
} from '@powersync/common';
import { AdditionalOptions, DifferentialHookOptions, QueryResult, ReadonlyQueryResult } from './watch-types.js';
import { WatchCompatibleQueryWithParams } from './watch-utils.js';

type Result<RowType> = QueryResult<RowType> | ReadonlyQueryResult<RowType>;

export type RunnerConfig<RowType> =
  // No PowerSync database in context, reported as error.
  | { kind: 'missing-db' }
  // Query included sync streams that have not synced yet
  | { kind: 'waiting-for-streams' }
  | { kind: 'compile-error'; error: Error }
  | QueryConfig<RowType>;

interface QueryConfig<RowType> {
  kind: 'query';
  db: CommonPowerSyncDatabase;
  query: WatchCompatibleQueryWithParams<RowType[]>;
  sql: string;
  parameters: any[];
  stringifiedParams: string; // For efficient comparisons
  runOnce: boolean;
  rowComparator: DifferentialWatchedQueryComparator<RowType> | undefined;
  throttleMs: number | undefined;
  reportFetching: boolean | undefined;
}

function configEquals<RowType>(a: RunnerConfig<RowType>, b: RunnerConfig<RowType>): boolean {
  if (a === b) return true;

  switch (a.kind) {
    case 'missing-db':
    case 'waiting-for-streams':
      return a.kind == b.kind;
    case 'compile-error':
      // compile() runs on every render, so a failing query throws a new error each time.
      return b.kind == 'compile-error' && a.error.message == b.error.message;
    case 'query':
      return (
        b.kind == 'query' &&
        a.db === b.db &&
        a.sql == b.sql &&
        a.stringifiedParams == b.stringifiedParams &&
        a.runOnce == b.runOnce &&
        // We don't compare rowComparator by reference, since it's typically an inline object changed on every rerender.
        // Only toggling betweetn differential and regular queries is considered a re-run worthy chamge.
        !!a.rowComparator == !!b.rowComparator &&
        a.throttleMs == b.throttleMs &&
        a.reportFetching == b.reportFetching
      );
  }
}

const _loadingState: QueryResult<never> = { isLoading: true, isFetching: false, data: [], error: undefined };

function idleResultFor<RowType>(config: RunnerConfig<RowType>): Result<RowType> {
  switch (config.kind) {
    case 'missing-db':
      return { isLoading: false, isFetching: false, data: [], error: new Error('PowerSync not configured.') };
    case 'waiting-for-streams':
      return _loadingState;
    case 'compile-error':
      return { isLoading: false, isFetching: false, data: [], error: config.error };
    case 'query':
      // Single queries always report fetching while they run.
      const isFetching = config.runOnce || (config.reportFetching ?? true);
      return { isLoading: true, isFetching, data: [], error: undefined };
  }
}

/**
 * Resolves the inputs of `useQuery` into a comparable {@link RunnerConfig}.
 *
 * This is pure (apart from compiling the query) and can run while rendering.
 */
export function resolveConfig<RowType>(
  db: CommonPowerSyncDatabase | null,
  query: WatchCompatibleQueryWithParams<RowType[]>,
  options: AdditionalOptions & DifferentialHookOptions<RowType>,
  streamsHaveSynced: boolean
): RunnerConfig<RowType> {
  if (db == null) {
    return { kind: 'missing-db' };
  }
  if (!streamsHaveSynced) {
    return { kind: 'waiting-for-streams' };
  }

  let sql: string;
  let parameters: any[];
  try {
    const compiled = query.compile();
    sql = compiled.sql;
    parameters = [...compiled.parameters];
  } catch (error) {
    return { kind: 'compile-error', error: error as Error };
  }

  return {
    kind: 'query',
    db,
    query,
    sql,
    parameters,
    stringifiedParams: query.stringifiedParameters ?? JSON.stringify(parameters),
    runOnce: options.runQueryOnce == true,
    rowComparator: options.rowComparator,
    throttleMs: options.throttleMs,
    reportFetching: options.reportFetching
  };
}

/**
 * An imperative store backing the `useQuery` hook. There is always one instance of this per `useQuery` hook.
 *
 * On every render, {@link resultFor} checks for config changes and returns the current result. Configuration changes
 * are not applied during renders. Instead, {@link configure} is used to apply configuration changes in a commit. This
 * ensures multiple {@link resultFor} calls in uncommited renders are cheap and don't trigger queries.
 *
 * Work is only active while at least one listener is registered.
 */
export class QueryRunner<RowType> {
  private readonly listeners = new Set<() => void>();
  private config: RunnerConfig<RowType> | null = null;
  private idleResult: Result<RowType> = _loadingState;
  /**
   * The active work, only non-null while we have listeners.
   */
  private work: QueryWork<RowType> | null = null;
  /**
   * A cached result for a config that hasn't been applied yet, so that repeated renders return a stable object.
   */
  private uncommitedConfigChange: {
    config: RunnerConfig<RowType>;
    snapshot: Result<RowType>;
    result: Result<RowType>;
    isOptimisticStateChange: boolean;
  } | null = null;

  readonly subscribe = (onChange: () => void): (() => void) => {
    this.listeners.add(onChange);
    if (this.listeners.size == 1) {
      this.startWork();
      this.notifyListeners();
    }

    return () => {
      this.listeners.delete(onChange);
      if (this.listeners.size == 0) {
        this.work?.dispose();
        this.work = null;
      }
    };
  };

  readonly getSnapshot = (): Result<RowType> => {
    return this.work?.result ?? this.idleResult;
  };

  /**
   * Returns the result to render for the given config, without changing the runner.
   *
   * If the config has already been applied, this is the current snapshot. Otherwise, it's the result we expect to
   * report right after {@link configure} applies it, so that changed inputs are reflected in the same render (even if
   * that render is ultimately dropped).
   */
  resultFor(config: RunnerConfig<RowType>, snapshot: Result<RowType>): Result<RowType> {
    if (this.config != null && configEquals(this.config, config)) {
      return snapshot;
    }

    const pending = this.uncommitedConfigChange;
    if (pending != null && pending.snapshot === snapshot && configEquals(pending.config, config)) {
      return pending.result;
    }

    // A re-render has changed the query, and we'll start running that query in a useEffect hook calling configure.
    // For now, optimistically return the loading state that query would start.
    const fromWork = this.work?.pendingResultFor(config);
    const result = fromWork ?? idleResultFor(config);
    this.uncommitedConfigChange = { config, snapshot, result, isOptimisticStateChange: fromWork == null };
    return result;
  }

  /**
   * Applies the inputs of a committed render to this runner. This does nothing if they haven't changed.
   *
   * This modifies state and should not run during a render.
   */
  configure(next: RunnerConfig<RowType>) {
    if (this.config != null && configEquals(this.config, next)) {
      return;
    }

    const pending = this.uncommitedConfigChange;
    this.config = next;
    this.idleResult =
      pending != null && pending.isOptimisticStateChange && configEquals(pending.config, next)
        ? // We already returned this as an optimistic state in a previous resultFor call. Use the same result to not
          // cause another render.
          pending.result
        : idleResultFor(next);
    this.uncommitedConfigChange = null;

    if (this.work == null || !this.work.tryUpdate(next)) {
      this.work?.dispose();
      this.work = null;
      if (this.listeners.size > 0) {
        this.startWork();
      }
    }

    this.notifyListeners();
  }

  private startWork() {
    const config = this.config;
    if (config == null || config.kind != 'query') {
      return;
    }

    const emit = () => this.notifyListeners();
    this.work = config.runOnce
      ? new SingleQueryWork(config, this.idleResult, emit)
      : new WatchedQueryWork(config, this.idleResult, emit);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/**
 * Active work to run a query (once or watched).
 */
interface QueryWork<RowType> {
  readonly result: Result<RowType>;
  /**
   * If {@link tryUpdate} would accept the config, returns the result to report until it's applied. Must be pure.
   */
  pendingResultFor(config: RunnerConfig<RowType>): Result<RowType> | null;
  /**
   * Attempts to apply the new config to this work without restarting it.
   */
  tryUpdate(config: RunnerConfig<RowType>): boolean;
  dispose(): void;
}

class SingleQueryWork<RowType> implements QueryWork<RowType> {
  result: QueryResult<RowType>;
  private abortController: AbortController | null = null;

  constructor(
    private readonly config: QueryConfig<RowType>,
    initial: Result<RowType>,
    private readonly emit: () => void
  ) {
    this.result = { ...(initial as QueryResult<RowType>), isFetching: true, refresh: this.refresh };
    this.run();
  }

  readonly refresh = async (signal?: AbortSignal) => {
    await this.run(signal);
  };

  private setResult(update: Partial<QueryResult<RowType>>) {
    this.result = { ...this.result, ...update };
    this.emit();
  }

  private async run(outerSignal?: AbortSignal) {
    this.abortController?.abort();
    const controller = (this.abortController = new AbortController());
    const signal = controller.signal;
    const isAborted = () => signal.aborted || outerSignal?.aborted == true;

    if (!this.result.isLoading || !this.result.isFetching || this.result.error) {
      this.setResult({ isLoading: true, isFetching: true, error: undefined });
    }

    const { query, sql, parameters, db } = this.config;
    try {
      const data = await query.execute({ sql, parameters: parameters, db });
      if (isAborted()) return;
      this.setResult({ isLoading: false, isFetching: false, data, error: undefined });
    } catch (error) {
      if (isAborted()) return;
      this.setResult({ isLoading: false, isFetching: false, data: [], error: error as Error });
    }
  }

  pendingResultFor(): null {
    return null;
  }

  tryUpdate(): boolean {
    return false;
  }

  dispose(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}

class WatchedQueryWork<RowType> implements QueryWork<RowType> {
  result: Result<RowType>;
  private readonly watch: DifferentialWatchedQuery<RowType>;
  private readonly disposeListener: () => void;
  /**
   * Set after calling `updateSettings` until the watched query starts applying the new settings. We report
   * `isFetching` in the meantime so that the hook doesn't briefly appear settled with stale data.
   */
  private pendingUpdate = false;
  private reportFetching: boolean;

  constructor(
    private config: QueryConfig<RowType>,
    initial: Result<RowType>,
    private readonly emit: () => void
  ) {
    this.result = initial;
    this.reportFetching = config.reportFetching ?? true;

    const { db, query, rowComparator, throttleMs, reportFetching } = config;
    this.watch = rowComparator
      ? db.customQuery(query).differentialWatch({ rowComparator, reportFetching, throttleMs })
      : db.customQuery(query).watch({ reportFetching, throttleMs });

    this.disposeListener = this.watch.registerListener({
      onStateChange: (state) => {
        this.result = this.mapState(state);
        this.emit();
      },
      settingsWillUpdate: () => {
        if (this.pendingUpdate) {
          this.pendingUpdate = false;
          this.result = this.mapState(this.watch.state);
          this.emit();
        }
      }
    });
  }

  private mapState(state: WatchedQueryState<ReadonlyArray<Readonly<RowType>>>): Result<RowType> {
    // The state object may be mutated by the watched query, so we copy it into a fresh snapshot.
    return {
      data: state.data as RowType[],
      isLoading: state.isLoading,
      isFetching: state.isFetching || (this.pendingUpdate && this.reportFetching),
      error: state.error ?? undefined
    };
  }

  private canUpdate(config: RunnerConfig<RowType>): config is QueryConfig<RowType> {
    return (
      config.kind == 'query' &&
      !config.runOnce &&
      config.db === this.config.db &&
      !!config.rowComparator == !!this.config.rowComparator
    );
  }

  pendingResultFor(config: RunnerConfig<RowType>): Result<RowType> | null {
    if (!this.canUpdate(config)) {
      return null;
    }

    // Keep the previous data while the updated query runs.
    return { ...this.result, isFetching: this.result.isFetching || (config.reportFetching ?? true) };
  }

  tryUpdate(config: RunnerConfig<RowType>): boolean {
    if (!this.canUpdate(config)) {
      return false;
    }

    this.config = config;
    this.reportFetching = config.reportFetching ?? true;
    this.pendingUpdate = true;
    this.watch.updateSettings({
      query: config.query,
      throttleMs: config.throttleMs,
      reportFetching: config.reportFetching
    });
    this.result = this.mapState(this.watch.state);
    return true;
  }

  dispose(): void {
    this.disposeListener();
    this.watch.close();
  }
}
