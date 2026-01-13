/**
 * An async iterator that can't be cancelled.
 *
 * To keep data flow simple, we always pass an explicit cancellation token when subscribing to async streams.
 */
export type SimpleAsyncIterator<T> = {
  next: () => Promise<IteratorResult<T>>;
};

export const doneResult: IteratorReturnResult<any> = { done: true, value: undefined };

export function valueResult<T>(value: T) {
  return { done: false, value };
}

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

export function injectable<T>(source: SimpleAsyncIterator<T>): InjectableIterator<T> {
  type Waiter = { resolve: (t: IteratorResult<T>) => void; reject: (e: unknown) => void };

  let sourceIsDone = false;
  let waiter: Waiter | undefined = undefined;
  let pendingSourceEvent: ((w: Waiter) => void) | null = null;

  let pendingInjectedEvents: T[] = [];

  const consumeWaiter = () => {
    const pending = waiter;
    if (pending != null) {
      waiter = undefined;
      return pending;
    } else {
      return undefined;
    }
  };

  const fetchFromSource = () => {
    const resolve = (propagate: (w: Waiter) => void) => {
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
        resolve((w) => w.resolve(value));
      },
      (error) => {
        resolve((w) => w.reject(error));
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
