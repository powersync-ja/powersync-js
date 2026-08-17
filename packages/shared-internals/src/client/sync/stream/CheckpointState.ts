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
  private readonly stateChanged = new EventQueue<CheckpointState>();

  /**
   * Use to immediately restart another download iteration if it is retry delay when a new checkpoint is requested.
   */
  private waitingForCheckpointsReady = asyncNotifier();

  private updateState(state: CheckpointState) {
    this.currentState = state;
    this.stateChanged.notify(state);
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
    do {
      const current = this.currentState;

      switch (current.state) {
        case 'disconnected':
          throwCannotRequestDueToDisconnectedError();
        case 'ready':
          return true;
        case 'error':
          throw current.error;
        case 'pending': {
          // Wait for the next event.
          if (wakeDownloadLoop) {
            this.waitingForCheckpointsReady.notify();
          }
        }
      }
    } while ((await this.stateChanged.waitForEvent(abort)) != null);

    return false; // waitForEvent returned null, meaning the wait was aborted
  }
}

export function throwCannotRequestDueToDisconnectedError(): never {
  throw new Error('Cannot request checkpoints, sync client is disconnected.');
}

export function isCheckpointRequestApplied(status: CoreSyncStatus | null, requestId: string): boolean {
  const applied = status?.internal_last_applied_checkpoint_request_id;
  return applied != null && BigInt(applied) >= BigInt(requestId);
}
