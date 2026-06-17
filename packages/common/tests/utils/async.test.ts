import { describe, expect, test } from 'vitest';
import { asyncNotifier, EventQueue } from '../../src/utils/async.js';

const neverAbort = new AbortController().signal;

describe('asyncNotifier', () => {
  test('waits for event', async () => {
    const notifier = asyncNotifier();
    let didReceiveEvent = false;
    notifier.waitForNotification(neverAbort).then((e) => {
      didReceiveEvent = true;
    });

    await Promise.resolve();
    expect(didReceiveEvent).toBeFalsy();
    notifier.notify();

    await Promise.resolve();
    expect(didReceiveEvent).toBeTruthy();
  });

  test('merges events', async () => {
    const notifier = asyncNotifier();
    for (let i = 0; i < 1000; i++) {
      notifier.notify();
    }

    let didReceiveEvent = false;
    notifier.waitForNotification(neverAbort).then((e) => {
      didReceiveEvent = true;
    });
    await Promise.resolve();
    expect(didReceiveEvent).toBeTruthy();

    // The first iterator.next() should have consumed everything.
    didReceiveEvent = false;
    notifier.waitForNotification(neverAbort).then((e) => {
      didReceiveEvent = true;
    });
    await Promise.resolve();
    expect(didReceiveEvent).toBeFalsy();
  });

  test('completes on abort', async () => {
    const notifier = asyncNotifier();
    await notifier.waitForNotification(AbortSignal.abort());
  });

  test('completes on abort later', async () => {
    const notifier = asyncNotifier();
    await notifier.waitForNotification(AbortSignal.timeout(10));
  });
});

describe('event queue', () => {
  test('can dispatch events in order', async () => {
    const queue = new EventQueue<number>();
    for (let i = 0; i < 1000; i++) {
      expect(queue.countOutstandingEvents).toStrictEqual(i);
      queue.notify(i);
      expect(queue.countOutstandingEvents).toStrictEqual(i + 1);
    }

    for (let i = 0; i < 1000; i++) {
      expect(queue.countOutstandingEvents).toStrictEqual(1000 - i);
      await queue.waitForEvent(neverAbort);
      expect(queue.countOutstandingEvents).toStrictEqual(1000 - i - 1);
    }
  });

  test('does not allow concurrent waits', async () => {
    const queue = new EventQueue<number>();
    queue.waitForEvent(neverAbort);
    await expect(() => queue.waitForEvent(neverAbort)).rejects.toThrow();
  });

  test('calls eventDelivered after dispatching to a waiting consumer', async () => {
    let deliveredCount = 0;
    const queue = new EventQueue<number>({ eventDelivered: () => deliveredCount++ });

    const waiter = queue.waitForEvent(neverAbort);
    queue.notify(42);
    await waiter;

    expect(deliveredCount).toBe(1);
  });

  test('calls eventDelivered after dispatching a buffered event', async () => {
    let deliveredCount = 0;
    const queue = new EventQueue<number>({ eventDelivered: () => deliveredCount++ });

    queue.notify(1);
    queue.notify(2);
    expect(deliveredCount).toBe(0); // not called until consumed

    await queue.waitForEvent(neverAbort);
    expect(deliveredCount).toBe(1);

    await queue.waitForEvent(neverAbort);
    expect(deliveredCount).toBe(2);
  });

  describe('queueBasedAsyncIterable', () => {
    test('generates a new queue for listener', () => {
      let createdQueues = 0;
      const iterable = EventQueue.queueBasedAsyncIterable((queue) => {
        createdQueues++;
      });

      for (let i = 0; i < 1000; i++) {
        iterable[Symbol.asyncIterator]();
      }

      expect(createdQueues).toStrictEqual(1000);
    });

    test('delivers events pushed by run callback', async () => {
      const iterable = EventQueue.queueBasedAsyncIterable<number>((queue) => {
        queue.notify(1);
        queue.notify(2);
        queue.notify(3);
      });

      const iterator = iterable[Symbol.asyncIterator]();
      expect(await iterator.next()).toStrictEqual({ done: false, value: 1 });
      expect(await iterator.next()).toStrictEqual({ done: false, value: 2 });
      expect(await iterator.next()).toStrictEqual({ done: false, value: 3 });
    });

    test('return() aborts the signal passed to run', async () => {
      let capturedSignal!: AbortSignal;

      const iterable = EventQueue.queueBasedAsyncIterable<number>((queue, signal) => {
        capturedSignal = signal;
      });

      const iterator = iterable[Symbol.asyncIterator]();
      expect(capturedSignal.aborted).toBe(false);

      await iterator.return!();

      expect(capturedSignal.aborted).toBe(true);
    });

    test('breaking out of for-await-of aborts the run signal', async () => {
      let capturedSignal!: AbortSignal;

      const iterable = EventQueue.queueBasedAsyncIterable<number>((queue, signal) => {
        capturedSignal = signal;
        queue.notify(1);
      });

      for await (const _ of iterable) {
        break;
      }

      expect(capturedSignal.aborted).toBe(true);
    });

    test('external abort signal stops the iteration', async () => {
      const externalAbort = new AbortController();

      const iterable = EventQueue.queueBasedAsyncIterable<number>(() => {
        // no events pushed — iterator would block indefinitely without the abort
      }, externalAbort.signal);

      const iterator = iterable[Symbol.asyncIterator]();
      const nextPromise = iterator.next();

      externalAbort.abort();

      expect(await nextPromise).toStrictEqual({ done: true, value: undefined });
    });

    test('pre-aborted external signal ends iteration immediately', async () => {
      const iterable = EventQueue.queueBasedAsyncIterable<number>((queue) => {
        queue.notify(1);
      }, AbortSignal.abort());

      const iterator = iterable[Symbol.asyncIterator]();
      expect(await iterator.next()).toStrictEqual({ done: true, value: undefined });
    });

    test('external abort also aborts the run signal', async () => {
      let capturedSignal!: AbortSignal;
      const externalAbort = new AbortController();

      const iterable = EventQueue.queueBasedAsyncIterable<number>((queue, signal) => {
        capturedSignal = signal;
      }, externalAbort.signal);

      iterable[Symbol.asyncIterator]();
      expect(capturedSignal.aborted).toBe(false);

      externalAbort.abort();

      expect(capturedSignal.aborted).toBe(true);
    });
  });
});
