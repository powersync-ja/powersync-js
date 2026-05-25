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
   * Notifies any pending listener, or makes the next {@link waitForNotification} complete immediately if no listener
   * is currently active.
   */
  notify(): void;
}

export function asyncNotifier(): AsyncNotifier {
  let waitingConsumers: (() => void)[] = [];
  let hasPendingNotification = false;

  return {
    notify() {
      if (waitingConsumers.length > 0) {
        waitingConsumers.splice(0, 1)[0]();
      } else {
        hasPendingNotification = true;
      }
    },
    waitForNotification(signal: AbortSignal) {
      return new Promise((resolve) => {
        if (signal.aborted) {
          resolve();
        } else if (hasPendingNotification) {
          resolve();
          hasPendingNotification = false;
        } else {
          function complete() {
            signal.removeEventListener('abort', onAbort);
            resolve();
          }

          function onAbort() {
            const i = waitingConsumers.indexOf(complete);
            if (i > -1) {
              waitingConsumers.splice(i, 1);
            }
            resolve();
          }

          waitingConsumers.push(complete);
          signal.addEventListener('abort', onAbort);
        }
      });
    }
  };
}
