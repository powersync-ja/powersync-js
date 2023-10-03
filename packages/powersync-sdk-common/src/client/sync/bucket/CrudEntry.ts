import hash from 'object-hash';

/**
 * 64-bit unsigned integer stored as a string in base-10.
 *
 * Not sortable as a string.
 */
export type OpId = string;

export enum UpdateType {
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE'
}

export type CrudEntryJSON = {
  id: string;
  data: string;
  tx_id?: number;
};

export type CrudEntryDataJSON = {
  data: Record<string, any>;
  op: UpdateType;
  type: string;
  id: string;
};

/**
 * The output JSOn seems to be a third type of JSON, not the same as the input JSON.
 */
export type CrudEntryOutputJSON = {
  op_id: number;
  op: UpdateType;
  type: string;
  id: string;
  tx_id?: number;
  data: Record<string, any>;
};

export class CrudEntry {
  clientId: number;
  id: string;
  op: UpdateType;
  opData?: Record<string, any>;
  table: string;
  transactionId?: number;

  static fromRow(dbRow: CrudEntryJSON) {
    const data: CrudEntryDataJSON = JSON.parse(dbRow.data);
    return new CrudEntry(parseInt(dbRow.id), data.op, data.type, data.id, dbRow.tx_id, data.data);
  }

  constructor(
    clientId: number,
    op: UpdateType,
    table: string,
    id: string,
    transactionId?: number,
    opData?: Record<string, any>
  ) {
    this.clientId = clientId;
    this.id = id;
    this.op = op;
    this.opData = opData;
    this.table = table;
    this.transactionId = transactionId;
  }

  toJSON(): CrudEntryOutputJSON {
    return {
      op_id: this.clientId,
      op: this.op,
      type: this.table,
      id: this.id,
      tx_id: this.transactionId,
      data: this.opData
    };
  }

  hashCode() {
    return hash([this.transactionId, this.clientId, this.op, this.table, this.id, this.opData]);
  }
}
