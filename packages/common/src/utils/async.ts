import { doneResult, valueResult } from './stream_transform.js';

/**
 * Throttle a function to be called at most once every "wait" milliseconds,
 * on the trailing edge.
 *
 * Roughly equivalent to lodash/throttle with {leading: false, trailing: true}
 */
export function throttleTrailing(func: () => void, wait: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const later = () => {
    func();
    timeoutId = null;
  };

  return function () {
    if (timeoutId == null) {
      timeoutId = setTimeout(later, wait);
    }
  };
}

export interface AsyncNotifier {
  /**
   * @param signal Also resolve the promise once this signal completes.
   * @returns A promise that resolves once {@link notify} is called after this promise was last resolved.
   */
  waitForNotification(signal: AbortSignal): Promise<void>;

  /**
   * Notifies a pending listener, or makes the next {@link waitForNotification} complete immediately if no listener
   * is currently active.
   */
  notify(): void;
}

export function asyncNotifier(): AsyncNotifier {
  const queue = new EventQueue<void>();

  return {
    notify() {
      if (queue.countOutstandingEvents > 0) {
        // Already has an outstanding event, no need to buffer another one.
      } else {
        queue.notify();
      }
    },
    waitForNotification(signal: AbortSignal) {
      return queue.waitForEvent(signal);
    }
  };
}

type QueueWaiter<T> = { resolve: (event: T) => void; reject: (error: unknown) => void };

export interface QueueOptions {
  eventDelivered?: () => void;
}

export class EventQueue<T> {
  private waitingConsumer: QueueWaiter<T> | undefined;
  private readonly outstandingEvents: Array<(waiter: QueueWaiter<T>) => void>;

  constructor(private readonly options: QueueOptions = {}) {
    this.outstandingEvents = [];
  }

  /**
   * The amount of buffered events not yet dispatched to listeners.
   */
  get countOutstandingEvents(): number {
    return this.outstandingEvents.length;
  }

  private notifyInner(dispatch: (waiter: QueueWaiter<T>) => void) {
    const existing = this.waitingConsumer;
    this.waitingConsumer = undefined;

    const dispatchAndNotifyListeners = (waiter: QueueWaiter<T>) => {
      dispatch(waiter);
      this.options.eventDelivered?.();
    };

    if (existing) {
      dispatchAndNotifyListeners(existing);
    } else {
      this.outstandingEvents.push(dispatchAndNotifyListeners);
    }
  }

  notify(value: T) {
    this.notifyInner((l) => l.resolve(value));
  }

  notifyError(error: unknown) {
    this.notifyInner((l) => l.reject(error));
  }

  waitForEvent(signal: AbortSignal): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (this.waitingConsumer != null) {
        throw new Error('Illegal call to waitForEvent, already has a waiter.');
      }

      const complete = () => {
        signal?.removeEventListener('abort', onAbort);
      };

      const onAbort = () => {
        complete();
        this.waitingConsumer = undefined;
        resolve(undefined);
      };

      const waiter: QueueWaiter<T> = {
        resolve: (value) => {
          complete();
          resolve(value);
        },
        reject: (error) => {
          complete();
          reject(error);
        }
      };

      if (signal.aborted) {
        resolve(undefined);
      } else if (this.countOutstandingEvents > 0) {
        const [event] = this.outstandingEvents.splice(0, 1);
        event(waiter);
      } else {
        this.waitingConsumer = waiter;
        signal.addEventListener('abort', onAbort);
      }
    });
  }

  /**
   * Creates an async iterable backed by event queues.
   *
   * @param run A function invoked for every new listener. It receives a queue backing the async iterator.
   * @param abort An additional abort signal. The `run` callback will also be aborted when `AsyncIterator.return` is
   * called.
   * @returns An object conforming to the async iterable protocol.
   */
  static queueBasedAsyncIterable<T>(
    run: (queue: EventQueue<T>, abort: AbortSignal) => void,
    abort?: AbortSignal
  ): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator]: () => {
        const queue = new EventQueue<T>();
        const controller = new AbortController();

        function dispose() {
          controller.abort();
          abort?.removeEventListener('abort', dispose);
        }

        if (abort) {
          if (abort.aborted) {
            controller.abort();
          } else {
            abort.addEventListener('abort', dispose);
          }
        }

        run(queue, controller.signal);

        return {
          async next(): Promise<IteratorResult<T>> {
            const event = await queue.waitForEvent(controller.signal);
            return event == null ? doneResult : valueResult(event);
          },
          async return(): Promise<IteratorResult<T>> {
            dispose();
            return doneResult;
          }
        };
      }
    };
  }
}
