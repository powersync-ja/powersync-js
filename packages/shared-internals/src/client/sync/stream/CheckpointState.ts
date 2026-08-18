import { BaseListener, BaseObserver } from '@powersync/common';
import { asyncNotifier, EventQueue } from '../../../utils/async.js';
import { CoreSyncStatus } from './core-instruction.js';

export type CheckpointState =
  | { state: 'pending' }
  | { state: 'disconnected' }
  | { state: 'ready' }
  | { state: 'error'; error: unknown };

const pending: CheckpointState = { state: 'pending' };

export class CheckpointStateSignals {
  private currentState: CheckpointState = pending;
  private readonly stateChanged = new BaseObserver<CheckpointStateListener>();

  /**
   * Use to immediately restart another download iteration if it is retry delay when a new checkpoint is requested.
   */
  private waitingForCheckpointsReady = asyncNotifier();

  private updateState(state: CheckpointState) {
    this.currentState = state;
    this.stateChanged.iterateListeners((l) => l.stateChanged?.());
  }

  /**
   * Marks the current download iteration as ended, blocking new checkpoint requests until the seed performed in the
   * next iteration.
   */
  downloadIterationEnded() {
    this.updateState(pending);

    // Checkpoint waiters called after this should be able to resume the download iteration.
    this.waitingForCheckpointsReady = asyncNotifier();
  }

  /**
   * Marks the sync client as disconnected, failing all outstanding checkpoint requests and preventing new ones.
   */
  disconnected() {
    this.updateState({ state: 'disconnected' });
  }

  /**
   * Returns a promise that resolves with the abort signal or when we have a waiter wanting to request a checkpoint.
   */
  waitForCheckpointWaiter(signal: AbortSignal) {
    return this.waitingForCheckpointsReady.waitForNotification(signal);
  }

  markCheckpointsReady(completion: Promise<void>): Promise<void> {
    return completion.then(
      (_) => this.updateState({ state: 'ready' }),
      (error) => {
        this.updateState({ state: 'error', error });
        throw error;
      }
    );
  }

  /**
   * Waits until a download iteration is active and has seeded the checkpoint state, meaning that checkpoint ids can
   * safely be allocated.
   *
   * @returns Turue if checkpoints are ready, false if aborted.
   */
  async waitForCheckpointRequestsReady(abort: AbortSignal, wakeDownloadLoop = true): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Resolves the promise from the current state if possible, returning true if it was.
      const handleState = () => {
        const state = this.currentState;
        switch (state.state) {
          case 'disconnected':
            reject(cannotRequestDueToDisconnectedError());
            return true;
          case 'ready':
            resolve(true);
            return true;
          case 'error':
            reject(state.error);
            return true;
          case 'pending': {
            // Wait for the next event.
            if (wakeDownloadLoop) {
              this.waitingForCheckpointsReady.notify();
            }
            return false;
          }
        }
      };

      if (handleState()) {
        return;
      }

      let removeListener: () => void;
      let onAbort: () => void;

      function cleanup() {
        removeListener();
        abort.removeEventListener('abort', onAbort);
      }

      onAbort = () => {
        resolve(false);
        cleanup();
      };
      removeListener = this.stateChanged.registerListener({
        stateChanged() {
          if (handleState()) {
            cleanup();
          }
        }
      });
      abort.addEventListener('abort', onAbort);
    });
  }
}

interface CheckpointStateListener extends BaseListener {
  stateChanged(): void;
}

export function cannotRequestDueToDisconnectedError(): Error {
  return new Error('Cannot request checkpoints, sync client is disconnected.');
}

export function checkpointRequestsNotEnabledError(): Error {
  return new Error('Connected with legacy checkpoint mode, cannot request checkpoints.');
}

export function isCheckpointRequestApplied(status: CoreSyncStatus | null, requestId: bigint): boolean {
  const applied = status?.internal_last_applied_checkpoint_request_id;
  return applied != null && BigInt(applied) >= requestId;
}
