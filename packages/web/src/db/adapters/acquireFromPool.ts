import type { DBLockOptions } from '@powersync/common';
import type { Mutex, Semaphore, UnlockFn } from '@powersync/shared-internals';

/**
 * Internal helper function to acquire a connection from a pool that has a designated writer, additional readers, and
 * also allows dispatching reads to the writer.
 */
export async function acquireFromPool<Connection, Res>(
  writerMutex: Mutex,
  writer: Connection,
  readers: Semaphore<Connection>,
  callback: (connection: Connection) => Promise<Res>,
  options: DBLockOptions | undefined,
  allowReadOnly: boolean
): Promise<Res> {
  const abortController = new AbortController();
  const abortSignal = abortController.signal;

  let timeout: any = null;
  let release: UnlockFn | undefined;
  if (options?.timeoutMs) {
    timeout = setTimeout(() => abortController.abort('requesting database timed out'), options.timeoutMs);
  }

  try {
    if (allowReadOnly) {
      let connection: Connection;

      // Even if we have a pool of read connections, it's typically very small and we assume that most queries are
      // reads. So, we want to request any connection from the read pool and the dedicated write connection (which
      // can also serve reads). We race for the first connection we can obtain this way, and then abort the other
      // request.
      [connection, release] = await new Promise<[Connection, UnlockFn]>((resolve, reject) => {
        let didComplete = false;
        function complete() {
          didComplete = true;
          abortController.abort();
        }

        function completeSuccess(connection: Connection, returnFn: UnlockFn) {
          if (didComplete) {
            // We're not going to use this connection, so return it immediately.
            returnFn();
          } else {
            complete();
            resolve([connection, returnFn]);
          }
        }

        function completeError(error: unknown) {
          // We either have a working connection already, or we've rejected the promise. Either way, we don't need
          // to do either thing again.
          if (didComplete) return;

          complete();
          reject(error);
        }

        writerMutex.acquire(abortSignal).then((unlock) => completeSuccess(writer, unlock), completeError);
        if (readers.size) {
          readers.requestOne(abortSignal).then(({ item, release }) => completeSuccess(item, release), completeError);
        }
      });

      return await callback(connection);
    } else {
      return await writerMutex.runExclusive(() => callback(writer), abortSignal);
    }
  } finally {
    if (timeout != null) {
      clearTimeout(timeout);
    }
    release?.();
  }
}
