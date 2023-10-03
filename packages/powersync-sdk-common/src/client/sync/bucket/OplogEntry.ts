import { OpId } from './CrudEntry';
import { OpType, OpTypeJSON } from './OpType';

export interface OplogEntryJSON {
  op_id: string;
  op: OpTypeJSON;
  object_type: string;
  object_id: string;
  checksum: number;
  data: string | object;
  subkey: string | object;
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
      typeof row.data == 'string' ? JSON.parse(row.data) : row.data
    );
  }

  constructor(
    public op_id: OpId,
    public op: OpType,
    public checksum: number,
    public subkey: string,
    public object_type?: string,
    public object_id?: string,
    public data?: Record<string, any>
  ) {}

  toJSON(): OplogEntryJSON {
    return {
      op_id: this.op_id,
      op: this.op.toJSON(),
      object_type: this.object_type,
      object_id: this.object_id,
      checksum: this.checksum,
      data: JSON.stringify(this.data),
      subkey: JSON.stringify(this.subkey)
    };
  }
}
