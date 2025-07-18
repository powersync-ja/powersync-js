/**
 * 64-bit unsigned integer stored as a string in base-10.
 *
 * Not sortable as a string.
 */
export type OpId = string;

/**
 * Type of local change.
 */
export enum UpdateType {
  /** Insert or replace existing row. All non-null columns are included in the data. Generated by INSERT statements. */
  PUT = 'PUT',
  /** Update existing row. Contains the id, and value of each changed column. Generated by UPDATE statements. */
  PATCH = 'PATCH',
  /** Delete existing row. Contains the id. Generated by DELETE statements. */
  DELETE = 'DELETE'
}

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
 */
export class CrudEntry {
  /**
   * Auto-incrementing client-side id.
   */
  clientId: number;
  /**
   * ID of the changed row.
   */
  id: string;
  /**
   * Type of change.
   */
  op: UpdateType;
  /**
   * Data associated with the change.
   */
  opData?: Record<string, any>;

  /**
   * For tables where the `trackPreviousValues` option has been enabled, this tracks previous values for
   * `UPDATE` and `DELETE` statements.
   */
  previousValues?: Record<string, any>;

  /**
   * Table that contained the change.
   */
  table: string;
  /**
   * Auto-incrementing transaction id. This is the same for all operations within the same transaction.
   */
  transactionId?: number;

  /**
   * Client-side metadata attached with this write.
   *
   * This field is only available when the `trackMetadata` option was set to `true` when creating a table
   * and the insert or update statement set the `_metadata` column.
   */
  metadata?: string;

  static fromRow(dbRow: CrudEntryJSON) {
    const data: CrudEntryDataJSON = JSON.parse(dbRow.data);
    return new CrudEntry(
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

  /**
   * Converts the change to JSON format.
   */
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
   * The hash code for this object.
   * @deprecated This should not be necessary in the JS SDK.
   * Use the  @see CrudEntry#equals method instead.
   * TODO remove in the next major release.
   */
  hashCode() {
    return JSON.stringify(this.toComparisonArray());
  }

  /**
   * Generates an array for use in deep comparison operations
   */
  toComparisonArray() {
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
