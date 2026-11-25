import { describe, expect, test } from 'vitest';
import {
  CheckpointStateSignals,
  cannotRequestDueToDisconnectedError
} from '../../../../src/client/sync/stream/CheckpointState.js';

const neverAbort = new AbortController().signal;

describe('CheckpointStateSignals', () => {
  describe('waitForCheckpointRequestsReady', () => {
    test('resolves immediately when already ready', async () => {
      const signals = new CheckpointStateSignals();
      signals.markCheckpointsReady(Promise.resolve());
      await Promise.resolve();

      await expect(signals.waitForCheckpointRequestsReady(neverAbort)).resolves.toBe(true);
    });

    test('rejects when disconnected', async () => {
      const signals = new CheckpointStateSignals();
      signals.disconnected();

      await expect(signals.waitForCheckpointRequestsReady(neverAbort)).rejects.toThrow(
        cannotRequestDueToDisconnectedError().message
      );
    });

    test('rejects with the error', async () => {
      const signals = new CheckpointStateSignals();
      const error = new Error('boom');
      signals.markCheckpointsReady(Promise.reject(error)).catch(() => {});
      await Promise.resolve();

      await expect(signals.waitForCheckpointRequestsReady(neverAbort)).rejects.toThrow('boom');
    });

    test('can be aborted', async () => {
      const signals = new CheckpointStateSignals();
      const abort = new AbortController();

      const pendingResult = signals.waitForCheckpointRequestsReady(abort.signal);
      abort.abort();

      await expect(pendingResult).resolves.toBe(false);
    });

    test('settles when a disconnect already aborted the signal before waiting', async () => {
      const signals = new CheckpointStateSignals();
      const abort = new AbortController();
      abort.abort();

      await expect(signals.waitForCheckpointRequestsReady(abort.signal, false)).resolves.toBe(false);
    }, 500);

    test('supports concurrent waiters', async () => {
      const signals = new CheckpointStateSignals();

      const first = signals.waitForCheckpointRequestsReady(neverAbort);
      const second = signals.waitForCheckpointRequestsReady(neverAbort);
      await Promise.resolve();

      signals.markCheckpointsReady(Promise.resolve());

      await expect(first).resolves.toBe(true);
      await expect(second).resolves.toBe(true);
    });
  });

  test('waitForCheckpointWaiter is notified when a caller starts waiting while pending', async () => {
    const signals = new CheckpointStateSignals();

    const waiterNotified = signals.waitForCheckpointWaiter(neverAbort);
    signals.waitForCheckpointRequestsReady(neverAbort);

    await expect(waiterNotified).resolves.toBeUndefined();
  });

  test('does not notify waitForCheckpointWaiter when wakeDownloadLoop is false', async () => {
    const signals = new CheckpointStateSignals();
    const abort = new AbortController();

    let resolved = false;
    const waiterNotified = signals.waitForCheckpointWaiter(abort.signal).then(() => {
      resolved = true;
    });
    signals.waitForCheckpointRequestsReady(neverAbort, false);
    await Promise.resolve();

    expect(resolved).toBe(false);

    abort.abort();
    await waiterNotified;
    expect(resolved).toBe(true);
  });

  describe('a seed from an iteration that already ended', () => {
    test('does not fail checkpoint requests of the next iteration when it rejects', async () => {
      const signals = new CheckpointStateSignals();
      let failOldSeed!: (error: Error) => void;
      signals
        .markCheckpointsReady(
          new Promise((_, reject) => {
            failOldSeed = reject;
          })
        )
        .catch(() => {});
      signals.downloadIterationEnded();

      // The old iteration's requests are aborted after it ended.
      failOldSeed(new Error('Closing sync stream network requests before retry.'));
      await new Promise((resolve) => setTimeout(resolve));

      let request: boolean | Error | undefined;
      signals.waitForCheckpointRequestsReady(neverAbort).then(
        (ready) => (request = ready),
        (error) => (request = error)
      );
      await new Promise((resolve) => setTimeout(resolve));
      expect(request).toBeUndefined();

      await signals.markCheckpointsReady(Promise.resolve());
      await new Promise((resolve) => setTimeout(resolve));
      expect(request).toBe(true);
    });

    test('does not mark the next iteration ready when it resolves', async () => {
      const signals = new CheckpointStateSignals();
      let finishOldSeed!: () => void;
      const oldSeed = signals.markCheckpointsReady(
        new Promise((resolve) => {
          finishOldSeed = resolve;
        })
      );
      signals.downloadIterationEnded();

      finishOldSeed();
      await oldSeed;

      let resolved = false;
      signals.waitForCheckpointRequestsReady(neverAbort).then(() => (resolved = true));
      await new Promise((resolve) => setTimeout(resolve));
      expect(resolved).toBe(false);
    });

    test('does not undo a disconnect', async () => {
      const signals = new CheckpointStateSignals();
      let finishOldSeed!: () => void;
      const oldSeed = signals.markCheckpointsReady(
        new Promise((resolve) => {
          finishOldSeed = resolve;
        })
      );
      signals.disconnected();

      finishOldSeed();
      await oldSeed;

      await expect(signals.waitForCheckpointRequestsReady(neverAbort)).rejects.toThrow(
        cannotRequestDueToDisconnectedError().message
      );
    });
  });
});
