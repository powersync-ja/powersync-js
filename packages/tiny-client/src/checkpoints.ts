// we want to hide this from consumers
export const checkpointId = Symbol();

export interface MutationGuard {
  completeWith(checkpoint: RequestedCheckpoint): void;
}

export interface RequestedCheckpoint {
  [checkpointId]: bigint;
}

export class LocalWriteState {
  readonly #uncompletedMutationGuards = new Set<MutationGuard>();
  #targetCheckpoint: bigint | null = null;

  get hasLocalWrites(): boolean {
    return this.#uncompletedMutationGuards.size > 0;
  }

  get targetCheckpoint() {
    return this.#targetCheckpoint;
  }

  mutationGuard(): MutationGuard {
    const guard = {
      completeWith: (checkpoint) => {
        this.#uncompletedMutationGuards.delete(guard);
        const id = checkpoint[checkpointId];
        if (this.#targetCheckpoint == null || this.#targetCheckpoint < id) {
          this.#targetCheckpoint = id;
        }
      }
    } satisfies MutationGuard;
    this.#uncompletedMutationGuards.add(guard);
    return guard;
  }
}
