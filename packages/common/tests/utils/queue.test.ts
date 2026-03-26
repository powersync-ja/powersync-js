import { describe, it, expect } from 'vitest';
import { Queue } from '../../src/utils/queue';

describe('Queue', () => {
  it('can remove elements', () => {
    const queue = new Queue([0, 1, 2, 3]);
    for (let i = 0; i < 3; i++) {
      expect(queue.length).toStrictEqual(4 - i);
      expect(queue.removeFirst()).toStrictEqual(i);
      expect(queue.isEmpty).toBeFalsy();
      expect(queue.length).toStrictEqual(3 - i);
    }

    expect(queue.removeFirst()).toStrictEqual(3);
    expect(queue.isEmpty).toBeTruthy();
    expect(queue.length).toStrictEqual(0);
    expect(() => queue.removeFirst()).toThrow('Queue is empty');
  });

  it('can add elements', () => {
    const queue = new Queue([0, 1]);
    expect(() => queue.addLast(2)).toThrow('Queue is full');

    for (let i = 0; i < 10; i++) {
      expect(queue.length).toStrictEqual(2);
      expect(queue.removeFirst()).toStrictEqual(i);
      expect(queue.length).toStrictEqual(1);
      queue.addLast(i + 2);
    }
  });

  it('no capacity', () => {
    const queue = new Queue<number>([]);
    expect(queue.isEmpty).toBeTruthy();
    expect(queue.length).toStrictEqual(0);
    expect(() => queue.addLast(0)).toThrow('Queue is full');
  });
});
