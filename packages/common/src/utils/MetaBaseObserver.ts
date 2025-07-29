import { BaseListener, BaseObserver, BaseObserverInterface } from './BaseObserver.js';

/**
 * Represents the counts of listeners for each event type in a BaseListener.
 */
export type ListenerCounts<Listener extends BaseListener> = Partial<Record<keyof Listener, number>> & {
  total: number;
};

/**
 * Meta listener which reports the counts of listeners for each event type.
 */
export interface MetaListener<ParentListener extends BaseListener> extends BaseListener {
  listenersChanged?: (counts: ListenerCounts<ParentListener>) => void;
}

export interface ListenerMetaManager<Listener extends BaseListener>
  extends BaseObserverInterface<MetaListener<Listener>> {
  counts: ListenerCounts<Listener>;
}

export interface MetaBaseObserverInterface<Listener extends BaseListener> extends BaseObserverInterface<Listener> {
  listenerMeta: ListenerMetaManager<Listener>;
}

/**
 * A BaseObserver that tracks the counts of listeners for each event type.
 */
export class MetaBaseObserver<Listener extends BaseListener>
  extends BaseObserver<Listener>
  implements MetaBaseObserverInterface<Listener>
{
  protected get listenerCounts(): ListenerCounts<Listener> {
    const counts = {} as Partial<Record<keyof Listener, number>>;
    let total = 0;
    for (const listener of this.listeners) {
      for (const key in listener) {
        if (listener[key]) {
          counts[key] = (counts[key] ?? 0) + 1;
          total++;
        }
      }
    }
    return {
      ...counts,
      total
    };
  }

  get listenerMeta(): ListenerMetaManager<Listener> {
    return {
      counts: this.listenerCounts,
      // Allows registering a meta listener that will be notified of changes in listener counts
      registerListener: (listener: Partial<MetaListener<Listener>>) => {
        return this.metaListener.registerListener(listener);
      }
    };
  }

  protected metaListener: BaseObserver<MetaListener<Listener>>;

  constructor() {
    super();
    this.metaListener = new BaseObserver<MetaListener<Listener>>();
  }

  registerListener(listener: Partial<Listener>): () => void {
    const dispose = super.registerListener(listener);
    const updatedCount = this.listenerCounts;
    this.metaListener.iterateListeners((l) => {
      l.listenersChanged?.(updatedCount);
    });
    return () => {
      dispose();
      const updatedCount = this.listenerCounts;
      this.metaListener.iterateListeners((l) => {
        l.listenersChanged?.(updatedCount);
      });
    };
  }
}
