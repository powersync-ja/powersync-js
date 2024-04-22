import { v4 } from 'uuid';

export interface Disposable {
  dispose: () => Promise<void>;
}

export interface BaseObserverInterface<T extends BaseListener> {
  registerListener(listener: Partial<T>): () => void;
}

export type BaseListener = {
  [key: string]: ((...event: any) => any) | undefined;
};

export class BaseObserver<T extends BaseListener = BaseListener> implements BaseObserverInterface<T> {
  protected listeners: Map<string, Partial<T>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register a listener for updates to the PowerSync client.
   */
  registerListener(listener: Partial<T>): () => void {
    const id = v4();
    this.listeners.set(id, listener);
    return () => {
      this.listeners.delete(id);
    };
  }

  iterateListeners(cb: (listener: Partial<T>) => any) {
    this.listeners.forEach((l) => cb(l));
  }

  async iterateAsyncListeners(cb: (listener: Partial<T>) => Promise<any>) {
    for (let i of Array.from(this.listeners.values())) {
      await cb(i);
    }
  }
}
