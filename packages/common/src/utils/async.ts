/**
 * A ponyfill for `Symbol.asyncIterator` that is compatible with the
 * [recommended polyfill](https://github.com/Azure/azure-sdk-for-js/blob/%40azure/core-asynciterator-polyfill_1.0.2/sdk/core/core-asynciterator-polyfill/src/index.ts#L4-L6)
 * we recommend for React Native.
 *
 * As long as we use this symbol (instead of `for await` and `async *`) in this package, we can be compatible with async
 * iterators without requiring them.
 */
export const symbolAsyncIterator: typeof Symbol.asyncIterator =
  Symbol.asyncIterator ?? Symbol.for('Symbol.asyncIterator');

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
