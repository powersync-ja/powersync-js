import { OpId } from './CrudEntry.js';
import { OpType, OpTypeJSON } from './OpType.js';

export interface OplogEntryJSON {
  checksum: number;
  data?: string;
  object_id?: string;
  object_type?: string;
  op_id: string;
  op: OpTypeJSON;
  subkey?: string | object;
}

export class OplogEntry {
  static fromRow(row: OplogEntryJSON) {
    return new OplogEntry(
      row.op_id,
      OpType.fromJSON(row.op),
      row.checksum,
      typeof row.subkey == 'string' ? row.subkey : JSON.stringify(row.subkey),
      row.object_type,
      row.object_id,
      row.data
    );
  }

  constructor(
    public op_id: OpId,
    public op: OpType,
    public checksum: number,
    public subkey: string,
    public object_type?: string,
    public object_id?: string,
    public data?: string
  ) {}

  toJSON(): OplogEntryJSON {
    return {
      op_id: this.op_id,
      op: this.op.toJSON(),
      object_type: this.object_type,
      object_id: this.object_id,
      checksum: this.checksum,
      data: this.data,
      subkey: JSON.stringify(this.subkey)
    };
  }
}
