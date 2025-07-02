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

/**
 * Throttle a function to be called at most once every "wait" milliseconds,
 * on the leading and trailing edge.
 *
 * Roughly equivalent to lodash/throttle with {leading: true, trailing: true}
 */
export function throttleLeadingTrailing(func: () => void, wait: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number = 0;

  const invokeFunction = () => {
    func();
    lastCallTime = Date.now();
    timeoutId = null;
  };

  return function () {
    const now = Date.now();
    const timeToWait = wait - (now - lastCallTime);

    if (timeToWait <= 0) {
      // Leading edge: Call the function immediately if enough time has passed
      invokeFunction();
    } else if (!timeoutId) {
      // Set a timeout for the trailing edge if not already set
      timeoutId = setTimeout(invokeFunction, timeToWait);
    }
  };
}

/**
 * Race a promise against an abort signal.
 * Returns a promise that resolves early if the signal is aborted before the
 * original promise resolves.
 *
 * Note: The signal does not cancel the promise. To cancel the promise then
 * its logic needs to explicitly check the signal.
 */
export function resolveEarlyOnAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal
): Promise<ResolveEarlyOnAbortResult<T>> {
  return new Promise((resolve, reject) => {
    const resolveWith = (result: ResolveEarlyOnAbortResult<T>) => {
      removeAbortHandler();
      resolve(result);
    };

    const rejectWith = (error: Error) => {
      removeAbortHandler();
      reject(error);
    };

    const abortHandler = () => {
      resolveWith({ aborted: true });
    };

    const addAbortHandler = () => {
      // Use an event listener to avoid interfering with the onabort
      // property where other code may have registered a handler.
      signal.addEventListener('abort', abortHandler);
    };

    const removeAbortHandler = () => {
      // Remove the abort handler to avoid memory leaks.
      signal.removeEventListener('abort', abortHandler);
    };

    addAbortHandler();

    if (signal.aborted) {
      abortHandler();
      return;
    }

    promise.then((result) => resolveWith({ result, aborted: false })).catch((error) => rejectWith(error));
  });
}

type ResolveEarlyOnAbortResult<T> = { result: T; aborted: false } | { aborted: true };
