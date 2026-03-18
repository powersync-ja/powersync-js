import { describe, it, expect, test } from 'vitest';
import { Mutex, timeoutSignal, UnlockFn } from '../../src/utils/mutex';

describe('Mutex', () => {
  it('runs blocks in sequence', async () => {
    const mutex = new Mutex();
    let inExclusive = 0;

    const promises: Promise<number>[] = [];
    for (let i = 0; i < 100; i++) {
      const number = i;
      promises.push(
        mutex.runExclusive(async () => {
          inExclusive++;
          expect(inExclusive).toStrictEqual(1);

          await new Promise((resolve) => setTimeout(resolve, 0));

          inExclusive--;
          expect(inExclusive).toStrictEqual(0);
          return number;
        })
      );
    }

    const results = await Promise.all(promises);
    expect(results).toStrictEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it('can abort waiter', async () => {
    const mutex = new Mutex();

    const firstLease = await mutex.acquire();
    const abortController = new AbortController();
    const secondLease = mutex.acquire(abortController.signal);
    let hasThirdLease: UnlockFn | null = null;
    mutex.acquire().then((l) => (hasThirdLease = l));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(hasThirdLease).toBeNull();
    abortController.abort();

    firstLease();
    await expect(secondLease).rejects.toThrow('This operation was aborted');
    // We should have skipped the second lease and resolve the third one instead.
    expect(hasThirdLease).not.toBeNull();
  });

  it('can abort waiter immediately', async () => {
    const mutex = new Mutex();

    const firstLease = await mutex.acquire();
    await expect(mutex.acquire(AbortSignal.abort())).rejects.toThrow('This operation was aborted');
    const thirdLease = mutex.acquire();

    await new Promise((resolve) => setTimeout(resolve, 0));

    firstLease();
    await thirdLease;
  });
});

test('timeoutSignal', async () => {
  expect(timeoutSignal()).toBeUndefined();

  const signal = timeoutSignal(250);
  expect(signal.aborted).toBeFalsy();
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(signal.aborted).toBeTruthy();
});
