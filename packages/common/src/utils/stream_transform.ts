/**
 * An async iterator that can't be cancelled.
 *
 * To keep data flow simple, we always pass an explicit cancellation token when subscribing to async streams. Once the
 * {@link AbortSignal} aborts, iterators are supposed to clean up and then emit a final `{done: true}` event.
 */
export type SimpleAsyncIterator<T> = Pick<AsyncIterator<T>, 'next'>;

export const doneResult: IteratorReturnResult<any> = { done: true, value: undefined };

export function valueResult<T>(value: T) {
  return { done: false, value };
}

/**
 * A variant of {@link Array.map} for async iterators.
 */
export function map<T1, T2>(source: SimpleAsyncIterator<T1>, map: (source: T1) => T2): SimpleAsyncIterator<T2> {
  return {
    next: async () => {
      const value = await source.next();
      if (value.done) {
        return value;
      } else {
        return { value: map(value.value) };
      }
    }
  };
}

export interface InjectableIterator<T> extends SimpleAsyncIterator<T> {
  inject(event: T);
}

/**
 * Expands a source async iterator by allowing to inject events asynchronously.
 *
 * The resulting iterator will emit all events from its source. Additionally though, events can be injected. These
 * events are dropped once the main iterator completes, but are otherwise forwarded.
 *
 * The iterator completes when its source completes, and it supports backpressure by only calling `next()` on the source
 * in response to a `next()` call from downstream if no pending injected events can be dispatched.
 */
export function injectable<T>(source: SimpleAsyncIterator<T>): InjectableIterator<T> {
  type Waiter = { resolve: (t: IteratorResult<T>) => void; reject: (e: unknown) => void };

  let sourceIsDone = false;
  let waiter: Waiter | undefined = undefined; // An active, waiting next() call.
  // A pending upstream event that couldn't be dispatched because inject() has been called before it was resolved.
  let pendingSourceEvent: ((w: Waiter) => void) | null = null;

  let pendingInjectedEvents: T[] = [];

  const consumeWaiter = () => {
    const pending = waiter;
    waiter = undefined;
    return pending;
  };

  const fetchFromSource = () => {
    const resolveWaiter = (propagate: (w: Waiter) => void) => {
      const active = consumeWaiter();
      if (active) {
        propagate(active);
      } else {
        pendingSourceEvent = propagate;
      }
    };

    const nextFromSource = source.next();
    nextFromSource.then(
      (value) => {
        sourceIsDone = value.done == true;
        resolveWaiter((w) => w.resolve(value));
      },
      (error) => {
        resolveWaiter((w) => w.reject(error));
      }
    );
  };

  return {
    next: () => {
      return new Promise((resolve, reject) => {
        // First priority: Dispatch from upstream
        if (sourceIsDone) {
          return resolve(doneResult);
        }
        if (pendingSourceEvent) {
          pendingSourceEvent({ resolve, reject });
          pendingSourceEvent = null;
          return;
        }

        // Second priority: Dispatch injected events
        if (pendingInjectedEvents.length) {
          return resolve(valueResult(pendingInjectedEvents.shift()!));
        }

        // Nothing pending? Fetch from source
        waiter = { resolve, reject };
        return fetchFromSource();
      });
    },
    inject: (event) => {
      const pending = consumeWaiter();
      if (pending != null) {
        pending.resolve(valueResult(event));
      } else {
        pendingInjectedEvents.push(event);
      }
    }
  };
}

/**
 * Splits a byte stream at line endings, emitting each line as a string.
 */
export function extractJsonLines(
  source: SimpleAsyncIterator<Uint8Array>,
  decoder: TextDecoder
): SimpleAsyncIterator<string> {
  let buffer = '';
  const pendingLines: string[] = [];
  let isFinalEvent = false;

  return {
    next: async () => {
      while (true) {
        if (isFinalEvent) {
          return doneResult;
        }

        if (pendingLines.length) {
          const first = pendingLines[0];
          pendingLines.splice(0, 1);
          return { done: false, value: first };
        }

        const { done, value } = await source.next();
        if (done) {
          const remaining = buffer.trim();
          if (remaining.length != 0) {
            isFinalEvent = true;
            return { done: false, value: remaining };
          }

          return doneResult;
        }

        const data = decoder.decode(value, { stream: true });
        buffer += data;

        const lines = buffer.split('\n');
        for (var i = 0; i < lines.length - 1; i++) {
          var l = lines[i].trim();
          if (l.length > 0) {
            pendingLines.push(l);
          }
        }

        buffer = lines[lines.length - 1];
      }
    }
  };
}

/**
 * Splits a concatenated stream of BSON objects by emitting individual objects.
 */
export function extractBsonObjects(source: SimpleAsyncIterator<Uint8Array>): SimpleAsyncIterator<Uint8Array> {
  const completedObjects: Uint8Array[] = []; // Fully read but not emitted yet.
  let isDone = false;

  const lengthBuffer = new DataView(new ArrayBuffer(4));
  let objectBody: Uint8Array | null = null;
  let remainingLength = 4;

  return {
    async next(): Promise<IteratorResult<Uint8Array>> {
      while (true) {
        if (completedObjects.length) {
          return valueResult(completedObjects.shift()!);
        }
        if (isDone) {
          return doneResult;
        }

        const upstreamEvent = await source.next();
        if (upstreamEvent.done) {
          isDone = true;
          if (objectBody || remainingLength != 4) {
            throw new Error('illegal end of stream in BSON object');
          }
          return doneResult;
        }

        const chunk = upstreamEvent.value;
        for (let i = 0; i < chunk.length; ) {
          const availableInData = chunk.length - i;

          if (objectBody) {
            // We're in the middle of reading a BSON document.
            const bytesToRead = Math.min(availableInData, remainingLength);
            const copySource = new Uint8Array(chunk.buffer, chunk.byteOffset + i, bytesToRead);
            objectBody.set(copySource, 4 + copySource.length - remainingLength);
            i += bytesToRead;
            remainingLength -= bytesToRead;

            if (remainingLength == 0) {
              completedObjects.push(objectBody);

              // Prepare reading another document, starting with its length
              objectBody = null;
              remainingLength = 4;
            }
          } else {
            // Copy up to 4 bytes into lengthBuffer, depending on how many we still need.
            const bytesToRead = Math.min(availableInData, remainingLength);
            for (let j = 0; j < bytesToRead; j++) {
              lengthBuffer.setUint8(4 - remainingLength + j, chunk[i + j]);
            }
            i += bytesToRead;
            remainingLength -= bytesToRead;

            if (remainingLength == 0) {
              // Transition from reading length header to reading document. Subtracting 4 because the length of the
              // header is included in length.
              const length = lengthBuffer.getInt32(0, true /* little endian */);
              remainingLength = length - 4;
              if (remainingLength < 1) {
                throw new Error(`invalid length for bson: ${length}`);
              }

              objectBody = new Uint8Array(length);
              for (let j = 0; j < 4; j++) {
                objectBody[j] = lengthBuffer.getUint8(j);
                lengthBuffer.setUint8(j, 0);
              }
            }
          }
        }
      }
    }
  };
}
