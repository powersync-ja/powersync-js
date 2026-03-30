import { describe, it, expect, test } from 'vitest';
import { Mutex, Semaphore, timeoutSignal, UnlockFn } from '../../src/utils/mutex';

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

describe('Semaphore', () => {
  it('gives items to requestOne in order', async () => {
    const semaphore = new Semaphore(['a', 'b', 'c']);

    const { item: item1, release: release1 } = await semaphore.requestOne();
    const { item: item2, release: release2 } = await semaphore.requestOne();
    const { item: item3, release: release3 } = await semaphore.requestOne();

    expect(item1).toBe('a');
    expect(item2).toBe('b');
    expect(item3).toBe('c');

    release1();
    release2();
    release3();
  });

  it('returns released items to waiting requestOne callers', async () => {
    const semaphore = new Semaphore(['x']);

    const { item, release } = await semaphore.requestOne();
    expect(item).toBe('x');

    let secondItem: string | null = null;
    const second = semaphore.requestOne().then(({ item, release }) => {
      secondItem = item;
      release();
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(secondItem).toBeNull();

    release();
    await second;
    expect(secondItem).toBe('x');
  });

  it('requestAll acquires all items and blocks until all are available', async () => {
    const semaphore = new Semaphore(['a', 'b', 'c']);

    const { item: item1, release: release1 } = await semaphore.requestOne();
    const { item: item2, release: release2 } = await semaphore.requestOne();

    let allItems: string[] | null = null;
    const allPromise = semaphore.requestAll().then(({ items, release }) => {
      allItems = items;
      release();
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(allItems).toBeNull();

    release1();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(allItems).toBeNull(); // Still waiting for item2

    release2();
    await allPromise;
    expect(allItems).toHaveLength(3);
    expect(allItems).toStrictEqual(['c', 'a', 'b']);
  });

  it('requestAll blocks subsequent requestOne until released', async () => {
    const semaphore = new Semaphore(['a', 'b']);

    const { items, release: releaseAll } = await semaphore.requestAll();
    expect(items).toStrictEqual(['a', 'b']);

    let gotOne: string | null = null;
    const onePromise = semaphore.requestOne().then(({ item, release }) => {
      gotOne = item;
      release();
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(gotOne).toBeNull();

    releaseAll();
    await onePromise;
    expect(gotOne).toStrictEqual('a');
  });

  it('can abort a waiting requestOne', async () => {
    const semaphore = new Semaphore(['x']);

    const { release: release1 } = await semaphore.requestOne();
    const abortController = new AbortController();
    const second = semaphore.requestOne(abortController.signal);

    let thirdItem: string | null = null;
    const third = semaphore.requestOne().then(({ item, release }) => {
      thirdItem = item;
      release();
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    abortController.abort();

    release1();
    await expect(second).rejects.toThrow();
    await third;
    expect(thirdItem).toBe('x');
  });

  it('can abort immediately', async () => {
    const semaphore = new Semaphore(['x']);

    const { release } = await semaphore.requestOne();
    await expect(semaphore.requestOne(AbortSignal.abort())).rejects.toThrow();

    const third = semaphore.requestOne();
    release();
    const { item } = await third;
    expect(item).toBe('x');
  });

  it('double-release is a no-op', async () => {
    const semaphore = new Semaphore(['x']);

    const { item, release } = await semaphore.requestOne();
    expect(item).toBe('x');

    release();
    release(); // Second call should be a no-op and not corrupt the pool.

    const { item: item2, release: release2 } = await semaphore.requestOne();
    expect(item2).toBe('x');
    release2();
  });

  it('distributes released items to mixed requestOne and requestAll waiters in order', async () => {
    const semaphore = new Semaphore(['a', 'b', 'c']);

    // Hold all items so subsequent requests queue up.
    const { release: releaseHeld } = await semaphore.requestAll();

    // Queue a requestOne first, then a requestAll behind it.
    const onePromise = semaphore.requestOne();
    const allPromise = semaphore.requestAll();

    await new Promise((resolve) => setTimeout(resolve, 0));

    releaseHeld();

    // requestOne was first in queue, so it resolves first. Releasing it satisfies the pending requestAll.
    const { item, release: releaseOne } = await onePromise;
    expect(item).toStrictEqual('a');
    releaseOne();

    const { items: allGot, release: releaseAll } = await allPromise;
    expect(allGot).toHaveLength(3);
    expect(allGot).toStrictEqual(['b', 'c', 'a']);
    releaseAll();
  });
});

test('timeoutSignal', async () => {
  expect(timeoutSignal()).toBeUndefined();

  const signal = timeoutSignal(250);
  expect(signal.aborted).toBeFalsy();
  await new Promise((resolve) => setTimeout(resolve, 300));
  expect(signal.aborted).toBeTruthy();
});
