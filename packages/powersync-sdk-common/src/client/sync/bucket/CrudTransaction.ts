import { CrudBatch } from './CrudBatch';
import { CrudEntry } from './CrudEntry';

export class CrudTransaction extends CrudBatch {
  constructor(
    public crud: CrudEntry[],
    public complete: (checkpoint?: string) => Promise<void>,
    public transactionId?: number
  ) {
    super(crud, false, complete);
  }
}
