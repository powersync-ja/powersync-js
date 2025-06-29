export type Disposer = () => unknown | PromiseLike<unknown>;

export interface DisposeManagerOptions {
  /**
   * Initial set of disposers to add to the manager.
   * Add more disposers later using {@link DisposeManager.add}.
   */
  disposers: Array<Disposer>;
}

/**
 * Use a DisposeManager to centralize the management of disposers.
 * Add one or more disposers to the manager, and use the manager's
 * dispose function to invoke them all in order.
 *
 * Once disposed, trying to dispose again is a no-op.
 */
export class DisposeManager {
  private disposed: boolean;
  private disposers: Array<Disposer>;

  constructor(options?: DisposeManagerOptions) {
    this.disposed = false;
    this.disposers = [...(options?.disposers ?? [])];
  }

  public isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Add a callback to be invoked when the manager is disposed.
   */
  public add(disposer: Disposer): void {
    if (this.disposed || !disposer) {
      return;
    }
    this.disposers.push(disposer);
  }

  /**
   * Add one or more signals that when any abort then disposes the manager.
   */
  public disposeOnAbort(signal: AbortSignal): void {
    if (this.disposed || !signal) {
      return;
    }

    if (signal.aborted) {
      this.dispose();
      return;
    }

    const dispose = () => this.dispose();

    signal.addEventListener('abort', dispose, { once: true });

    // Add cleanup for the event listener itself to avoid memory leaks
    this.add(() => {
      signal.removeEventListener('abort', dispose);
    });
  }

  /**
   * Invokes each disposer in order.
   * If any are async then they are not awaited.
   */
  public dispose(): void {
    return this.disposeInternal('sync');
  }

  /**
   * Invokes each disposer in order.
   * If any are async then they are awaited before calling the next disposer.
   */
  public async disposeAsync(): Promise<void> {
    return this.disposeInternal('async');
  }

  private disposeInternal(mode: 'sync'): void;
  private disposeInternal(mode: 'async'): Promise<void>;
  private disposeInternal(mode: 'sync' | 'async'): void | Promise<void> {
    if (this.disposed) {
      return mode === 'async' ? Promise.resolve() : undefined;
    }
    this.disposed = true;
    if (mode === 'async') {
      return Promise.resolve()
        .then(async () => {
          for (const disposer of this.disposers) {
            await disposer();
          }
        })
        .finally(() => {
          this.disposers.length = 0;
        });
    } else {
      try {
        for (const disposer of this.disposers) {
          disposer();
        }
      } finally {
        this.disposers.length = 0;
      }
    }
  }
}
