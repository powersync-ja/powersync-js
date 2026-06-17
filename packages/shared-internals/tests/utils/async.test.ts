import { describe, expect, test } from 'vitest';
import { asyncNotifier } from '../../src/utils/async.js';

describe('asyncNotifier', () => {
  const neverAbort = new AbortController().signal;

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
