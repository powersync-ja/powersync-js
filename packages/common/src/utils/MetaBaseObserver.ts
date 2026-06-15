import { BaseListener, BaseObserverInterface } from './BaseObserver.js';

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

export interface ListenerMetaManager<Listener extends BaseListener> extends BaseObserverInterface<
  MetaListener<Listener>
> {
  counts: ListenerCounts<Listener>;
}

export interface MetaBaseObserverInterface<Listener extends BaseListener> extends BaseObserverInterface<Listener> {
  listenerMeta: ListenerMetaManager<Listener>;
}
