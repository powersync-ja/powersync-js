/**
 * A simple fixed-capacity queue implementation.
 *
 * Unlike a naive queue implemented by `array.push()` and `array.shift()`, this avoids moving array elements around
 * and is `O(1)` for {@link addLast} and {@link removeFirst}.
 */
export class Queue<T> {
  private table: (T | undefined)[];
  // Index of the first element in the table.
  private head: number;
  // Amount of items currently in the queue.
  private _length: number;

  constructor(initialItems: Iterable<T>) {
    this.table = [...initialItems];
    this.head = 0;
    this._length = this.table.length;
  }

  get isEmpty(): boolean {
    return this.length == 0;
  }

  get length(): number {
    return this._length;
  }

  removeFirst(): T {
    if (this.isEmpty) {
      throw new Error('Queue is empty');
    }

    const result = this.table[this.head] as T;
    this._length--;
    this.table[this.head] = undefined;
    this.head = (this.head + 1) % this.table.length;
    return result;
  }

  addLast(element: T) {
    if (this.length == this.table.length) {
      throw new Error('Queue is full');
    }

    this.table[(this.head + this._length) % this.table.length] = element;
    this._length++;
  }
}
