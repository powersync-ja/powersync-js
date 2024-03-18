import { AbstractPowerSyncDatabase, SQLWatchOptions } from '@journeyapps/powersync-sdk-common';

export class WatchedQuery {
  listeners = new Set<() => void>();

  readyPromise: Promise<void>;
  isReady: boolean = false;
  currentData: any[] | undefined;
  currentError: any;

  private temporaryHolds = new Set();
  private controller: AbortController | undefined;
  private db: AbstractPowerSyncDatabase;

  private resolveReady: undefined | (() => void);

  readonly query: string;
  readonly parameters: any[];
  readonly options: SQLWatchOptions;
  private disposer: () => void;

  constructor(
    db: AbstractPowerSyncDatabase,
    query: string,
    parameters: any[],
    options: SQLWatchOptions,
    disposer: () => void
  ) {
    this.db = db;
    this.query = query;
    this.parameters = parameters;
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

    timeout = setTimeout(release, 5_000);

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

  private maybeListen() {
    if (this.controller != null) {
      return;
    }
    if (this.listeners.size == 0 && this.temporaryHolds.size == 0) {
      return;
    }

    const controller = new AbortController();
    this.controller = controller;

    (async () => {
      try {
        for await (const result of this.db.watch(this.query, this.parameters, {
          ...this.options,
          signal: this.controller.signal
        })) {
          const data = result.rows?._array ?? [];
          this.setData(data);
        }
      } catch (e) {
        this.setError(e);
      } finally {
        if (this.controller === controller) {
          this.controller = undefined;
        }
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
