import { CrudEntry, UpdateType } from '@powersync/common';

/**
 * @internal
 */
export type CrudEntryJSON = {
  id: string;
  data: string;
  tx_id?: number;
};

type CrudEntryDataJSON = {
  data: Record<string, any>;
  old?: Record<string, any>;
  op: UpdateType;
  type: string;
  id: string;
  metadata?: string;
};

/**
 * The output JSON seems to be a third type of JSON, not the same as the input JSON.
 */
type CrudEntryOutputJSON = {
  op_id: number;
  op: UpdateType;
  type: string;
  id: string;
  tx_id?: number;
  data?: Record<string, any>;
  old?: Record<string, any>;
  metadata?: string;
};

/**
 * A single client-side change.
 *
 * @public
 */
export class CrudEntryImpl implements CrudEntry {
  clientId: number;
  id: string;
  op: UpdateType;
  opData?: Record<string, any>;
  previousValues?: Record<string, any>;
  table: string;
  transactionId?: number;
  metadata?: string;

  static fromRow(dbRow: CrudEntryJSON): CrudEntry {
    const data: CrudEntryDataJSON = JSON.parse(dbRow.data);
    return new CrudEntryImpl(
      parseInt(dbRow.id),
      data.op,
      data.type,
      data.id,
      dbRow.tx_id,
      data.data,
      data.old,
      data.metadata
    );
  }

  constructor(
    clientId: number,
    op: UpdateType,
    table: string,
    id: string,
    transactionId?: number,
    opData?: Record<string, any>,
    previousValues?: Record<string, any>,
    metadata?: string
  ) {
    this.clientId = clientId;
    this.id = id;
    this.op = op;
    this.opData = opData;
    this.table = table;
    this.transactionId = transactionId;
    this.previousValues = previousValues;
    this.metadata = metadata;
  }

  toJSON(): CrudEntryOutputJSON {
    return {
      op_id: this.clientId,
      op: this.op,
      type: this.table,
      id: this.id,
      tx_id: this.transactionId,
      data: this.opData,
      old: this.previousValues,
      metadata: this.metadata
    };
  }

  equals(entry: CrudEntry) {
    return JSON.stringify(this.toComparisonArray()) == JSON.stringify(entry.toComparisonArray());
  }

  /**
   * Generates an array for use in deep comparison operations
   */
  toComparisonArray(): unknown[] {
    return [
      this.transactionId,
      this.clientId,
      this.op,
      this.table,
      this.id,
      this.opData,
      this.previousValues,
      this.metadata
    ];
  }
}
