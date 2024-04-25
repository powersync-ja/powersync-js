import { Transaction } from '@powersync/react-native';
import { System } from '../stores/system';
export interface ModelRecord {
  id: string;
}

export abstract class AbstractModel<Record extends ModelRecord = ModelRecord> {
  abstract table: string;

  constructor(
    public record: Record,
    protected system: System
  ) {}

  get id() {
    return this.record.id;
  }

  async setField<F extends keyof Record>(field: F, value: Record[F]) {
    await this.system.powersync.execute(`UPDATE ${this.table} SET ? = ? WHERE id = ?`, [field, value, this.id]);
    this.record[field] = value;
  }

  abstract update(record: Record): Promise<void>;

  /**
   * Removes a model from the DB. Takes an optional transaction.
   */
  async delete(tx?: Transaction) {
    if (tx) {
      return this._delete(tx);
    }
    return this.system.powersync.writeTransaction((tx) => this._delete(tx));
  }

  protected abstract _delete(tx: Transaction): Promise<void>;
}
