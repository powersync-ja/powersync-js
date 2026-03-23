import { Queue } from './queue.js';

export type UnlockFn = () => void;

/**
 * An asynchronous semaphore implementation with associated items per lease.
 *
 * @internal This class is meant to be used in PowerSync SDKs only, and is not part of the public API.
 */
export class Semaphore<T> {
  // Available items that are not currently assigned to a waiter.
  private readonly available: Queue<T>;

  readonly size: number;
  // Linked list of waiters. We don't expect the wait list to become particularly large, and this allows removing
  // aborted waiters from the middle of the list efficiently.
  private firstWaiter?: SemaphoreWaitNode<T>;
  private lastWaiter?: SemaphoreWaitNode<T>;

  constructor(elements: Iterable<T>) {
    this.available = new Queue(elements);
    this.size = this.available.length;
  }

  private addWaiter(requestedItems: number, onAcquire: () => void): SemaphoreWaitNode<T> {
    const node: SemaphoreWaitNode<T> = {
      isActive: true,
      acquiredItems: [],
      remainingItems: requestedItems,
      onAcquire,
      prev: this.lastWaiter
    };
    if (this.lastWaiter) {
      this.lastWaiter.next = node;
      this.lastWaiter = node;
    } else {
      // First waiter
      this.lastWaiter = this.firstWaiter = node;
    }

    return node;
  }

  private deactivateWaiter(waiter: SemaphoreWaitNode<T>) {
    const { prev, next } = waiter;
    waiter.isActive = false;

    if (prev) prev.next = next;
    if (next) next.prev = prev;
    if (waiter == this.firstWaiter) this.firstWaiter = next;
    if (waiter == this.lastWaiter) this.lastWaiter = prev;
  }

  private requestPermits(amount: number, abort?: AbortSignal): Promise<{ items: T[]; release: UnlockFn }> {
    if (amount <= 0 || amount > this.size) {
      throw new Error('Requested more items than exist in semaphore');
    }

    return new Promise((resolve, reject) => {
      function rejectAborted() {
        reject(abort?.reason ?? new Error('Semaphore acquire aborted'));
      }
      if (abort?.aborted) {
        return rejectAborted();
      }

      const markCompleted = (acquired: T[]) => {
        for (const element of acquired) {
          // Give to waiter, if possible.
          const waiter = this.firstWaiter;
          if (waiter) {
            waiter.acquiredItems.push(element);
            waiter.remainingItems--;
            if (waiter.remainingItems == 0) {
              waiter.onAcquire();
            }
          } else {
            // No pending waiter, return lease into pool.
            this.available.addLast(element);
          }
        }
      };

      let waiter: SemaphoreWaitNode<T>;

      const onAbort = () => {
        abort?.removeEventListener('abort', onAbort);

        if (waiter.isActive) {
          this.deactivateWaiter(waiter);
          rejectAborted();
        }
      };

      const resolvePromise = () => {
        this.deactivateWaiter(waiter);
        abort?.removeEventListener('abort', onAbort);

        const items = waiter.acquiredItems;
        resolve({ items, release: () => markCompleted(items) });
      };

      waiter = this.addWaiter(amount, resolvePromise);

      // If there are items in the pool that haven't been assigned, we can pull them into this waiter. Note that this is
      // only the case if we're the first waiter (otherwise, items would have been assigned to an earlier waiter).
      while (!this.available.isEmpty && waiter.remainingItems > 0) {
        waiter.acquiredItems.push(this.available.removeFirst());
        waiter.remainingItems--;
      }

      if (waiter.remainingItems == 0) {
        return resolvePromise();
      }

      abort?.addEventListener('abort', onAbort);
    });
  }

  /**
   * Requests a single item from the pool.
   *
   * The returned `release` callback must be invoked to return the item into the pool.
   */
  async requestOne(abort?: AbortSignal): Promise<{ item: T; release: UnlockFn }> {
    const { items, release } = await this.requestPermits(1, abort);
    return { release, item: items[0] };
  }

  /**
   * Requests access to all items from the pool.
   *
   * The returned `release` callback must be invoked to return items into the pool.
   */
  requestAll(abort?: AbortSignal): Promise<{ items: T[]; release: UnlockFn }> {
    return this.requestPermits(this.size, abort);
  }
}

interface SemaphoreWaitNode<T> {
  /**
   * Whether the waiter is currently active (not aborted and not fullfilled).
   */
  isActive: boolean;
  acquiredItems: T[];
  remainingItems: number;
  onAcquire: () => void;
  prev?: SemaphoreWaitNode<T>;
  next?: SemaphoreWaitNode<T>;
}

/**
 * An asynchronous mutex implementation.
 *
 * @internal This class is meant to be used in PowerSync SDKs only, and is not part of the public API.
 */
export class Mutex {
  private inner = new Semaphore([null]);

  async acquire(abort?: AbortSignal): Promise<UnlockFn> {
    const { release } = await this.inner.requestOne(abort);
    return release;
  }

  async runExclusive<T>(fn: () => PromiseLike<T> | T, abort?: AbortSignal): Promise<T> {
    const returnMutex = await this.acquire(abort);

    try {
      return await fn();
    } finally {
      returnMutex();
    }
  }
}

/**
 * Creates a signal aborting after the set timeout.
 */
export function timeoutSignal(timeout: number): AbortSignal;
export function timeoutSignal(timeout?: number): AbortSignal | undefined;

export function timeoutSignal(timeout?: number): AbortSignal | undefined {
  if (timeout == null) return;
  if ('timeout' in AbortSignal) return AbortSignal.timeout(timeout);

  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error('Timeout waiting for lock')), timeout);
  return controller.signal;
}
