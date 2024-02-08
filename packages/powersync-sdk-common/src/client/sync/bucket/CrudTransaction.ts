import { CrudBatch } from './CrudBatch';
import { CrudEntry } from './CrudEntry';

/**
 * TODO
 */
export class CrudTransaction extends CrudBatch {
  constructor(
    /**
     * List of client-side changes.
     */
    public crud: CrudEntry[],
    /**
     * Call to remove the changes from the local queue, once successfully uploaded.
     */
    public complete: (checkpoint?: string) => Promise<void>,
    /**
     * Unique transaction id.
     */
    public transactionId?: number
  ) {
    super(crud, false, complete);
  }
}
