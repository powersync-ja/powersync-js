import { AbstractPowerSyncDatabase, CompilableQuery, QueryResult, SQLWatchOptions } from '@powersync/common';
import { AdditionalOptions } from 'src/hooks/useQuery';

export class Query<T> {
  rawQuery: string | CompilableQuery<T>;
  sqlStatement: string;
  queryParameters: any[];
}

export class WatchedQuery {
  listeners = new Set<() => void>();

  readyPromise: Promise<void>;
  isReady: boolean = false;
  currentData: any[] | undefined;
  currentError: any;
  tables: any[] | undefined;

  private temporaryHolds = new Set();
  private controller: AbortController | undefined;
  private db: AbstractPowerSyncDatabase;

  private resolveReady: undefined | (() => void);

  readonly query: Query<unknown>;
  readonly options: AdditionalOptions;
  private disposer: () => void;

  constructor(db: AbstractPowerSyncDatabase, query: Query<unknown>, options: AdditionalOptions, disposer: () => void) {
    this.db = db;
    this.query = query;
    this.options = options;
    this.disposer = disposer;

    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  addTemporaryHold() {
    const ref = new Object();
    this.temporaryHolds.add(ref);
    this.maybeListen();

    let timeout: any;
    const release = () => {
      this.temporaryHolds.delete(ref);
      if (timeout) {
        clearTimeout(timeout);
      }
      this.maybeDispose();
    };

    const timeoutRelease = () => {
      if (this.isReady || this.controller == null) {
        release();
      } else {
        // If the query is taking long, keep the temporary hold.
        timeout = setTimeout(release, 5_000);
      }
    };

    timeout = setTimeout(timeoutRelease, 5_000);

    return release;
  }

  addListener(l: () => void) {
    this.listeners.add(l);

    this.maybeListen();
    return () => {
      this.listeners.delete(l);
      this.maybeDispose();
    };
  }

  private async fetchTables() {
    try {
      this.tables = await this.db.resolveTables(this.query.sqlStatement, this.query.queryParameters, this.options);
    } catch (e) {
      console.error('Failed to fetch tables:', e);
      this.setError(e);
    }
  }

  async fetchData() {
    try {
      const result =
        typeof this.query.rawQuery == 'string'
          ? await this.db.getAll(this.query.sqlStatement, this.query.queryParameters)
          : await this.query.rawQuery.execute();

      const data = result ?? [];
      this.setData(data);
    } catch (e) {
      console.error('Failed to fetch data:', e);
      this.setError(e);
    }
  }

  private maybeListen() {
    if (this.controller != null) {
      return;
    }
    if (this.listeners.size == 0 && this.temporaryHolds.size == 0) {
      return;
    }

    const controller = new AbortController();
    this.controller = controller;

    const onError = (error: Error) => {
      this.setError(error);
    };

    (async () => {
      await this.fetchTables();
      await this.fetchData();

      if (!this.options.runQueryOnce) {
        this.db.onChangeWithCallback(
          {
            onChange: async () => {
              await this.fetchData();
            },
            onError
          },
          {
            ...this.options,
            signal: this.controller.signal,
            tables: this.tables
          }
        );
      }
    })();
  }

  private setData(results: any[]) {
    this.isReady = true;
    this.currentData = results;
    this.currentError = undefined;
    this.resolveReady?.();

    for (let listener of this.listeners) {
      listener();
    }
  }

  private setError(error: any) {
    this.isReady = true;
    this.currentData = undefined;
    this.currentError = error;
    this.resolveReady?.();

    for (let listener of this.listeners) {
      listener();
    }
  }

  private maybeDispose() {
    if (this.listeners.size == 0 && this.temporaryHolds.size == 0) {
      this.controller?.abort();
      this.controller = undefined;
      this.isReady = false;
      this.currentData = undefined;
      this.currentError = undefined;
      this.disposer?.();

      this.readyPromise = new Promise((resolve, reject) => {
        this.resolveReady = resolve;
      });
    }
  }
}
