import { CrudEntry } from './CrudEntry';

export class CrudBatch {
  constructor(
    public crud: CrudEntry[],
    public haveMore: boolean,
    public complete: (writeCheckpoint?: string) => Promise<void>
  ) {}
}
