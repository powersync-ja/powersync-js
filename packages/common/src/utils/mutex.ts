export type UnlockFn = () => void;

/**
 * An asynchronous mutex implementation.
 *
 * @internal This class is meant to be used in PowerSync SDKs only, and is not part of the public API.
 */
export class Mutex {
  private inCriticalSection = false;

  // Linked list of waiters. We don't expect the wait list to become particularly large, and this allows removing
  // aborted waiters from the middle of the list efficiently.
  private firstWaiter?: MutexWaitNode;
  private lastWaiter?: MutexWaitNode;

  private addWaiter(onAcquire: () => void): MutexWaitNode {
    const node: MutexWaitNode = {
      isActive: true,
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

  private deactivateWaiter(waiter: MutexWaitNode) {
    const { prev, next } = waiter;
    waiter.isActive = false;

    if (prev) prev.next = next;
    if (next) next.prev = prev;
    if (waiter == this.firstWaiter) this.firstWaiter = next;
    if (waiter == this.lastWaiter) this.lastWaiter = prev;
  }

  acquire(abort?: AbortSignal): Promise<UnlockFn> {
    return new Promise((resolve, reject) => {
      let holdsMutex = false;

      const markCompleted = () => {
        if (!holdsMutex) return;
        holdsMutex = false;

        const waiter = this.firstWaiter;
        if (waiter) {
          this.deactivateWaiter(waiter);
          // Still in critical section, but owned by next waiter now.
          waiter.onAcquire();
        } else {
          this.inCriticalSection = false;
        }
      };

      if (!this.inCriticalSection) {
        this.inCriticalSection = true;
        holdsMutex = true;
        return resolve(markCompleted);
      } else {
        let node: MutexWaitNode;

        const onAbort = () => {
          abort?.removeEventListener('abort', onAbort);

          if (node.isActive) {
            this.deactivateWaiter(node);
            reject(abort?.reason ?? new Error('Mutex acquire aborted'));
          }
        };

        node = this.addWaiter(() => {
          abort?.removeEventListener('abort', onAbort);
          holdsMutex = true;
          resolve(markCompleted);
        });

        abort?.addEventListener('abort', onAbort);
      }
    });
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

interface MutexWaitNode {
  /**
   * Whether the waiter is currently active (not aborted and not fullfilled).
   */
  isActive: boolean;
  onAcquire: () => void;
  prev?: MutexWaitNode;
  next?: MutexWaitNode;
}

/**
 * Creates a signal aborting after the set timeout.
 */
export function timeoutSignal(timeout?: number): AbortSignal | undefined {
  if (timeout == null) return;
  if ('timeout' in AbortSignal) return AbortSignal.timeout(timeout);

  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error('Timeout waiting for lock')), timeout);
  return controller.signal;
}
