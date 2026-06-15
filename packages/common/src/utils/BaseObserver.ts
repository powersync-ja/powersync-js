/**
 * @public
 */
export interface Disposable {
  dispose: () => Promise<void> | void;
}

/**
 * @public
 */
export type BaseListener = Record<string, ((...event: any) => any) | undefined>;

/**
 * @public
 */
export interface BaseObserverInterface<T extends BaseListener> {
  registerListener(listener: Partial<T>): () => void;
}

/**
 * @public
 */
export class BaseObserver<T extends BaseListener = BaseListener> implements BaseObserverInterface<T> {
  protected listeners = new Set<Partial<T>>();

  constructor() {}

  dispose(): void {
    this.listeners.clear();
  }

  /**
   * Register a listener for updates to the PowerSync client.
   */
  registerListener(listener: Partial<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  iterateListeners(cb: (listener: Partial<T>) => any) {
    for (const listener of this.listeners) {
      cb(listener);
    }
  }

  async iterateAsyncListeners(cb: (listener: Partial<T>) => Promise<any>) {
    for (let i of Array.from(this.listeners.values())) {
      await cb(i);
    }
  }
}
