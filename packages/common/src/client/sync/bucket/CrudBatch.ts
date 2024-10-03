import { CrudEntry } from './CrudEntry.js';

/**
 * A batch of client-side changes.
 */
export class CrudBatch {
  constructor(
    /**
     * List of client-side changes.
     */
    public crud: CrudEntry[],
    /**
     * true if there are more changes in the local queue.
     */
    public haveMore: boolean,
    /**
     * Call to remove the changes from the local queue, once successfully uploaded.
     */
    public complete: (writeCheckpoint?: string) => Promise<void>
  ) {}
}
