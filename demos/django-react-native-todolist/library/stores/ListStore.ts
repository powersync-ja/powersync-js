import { LIST_TABLE, ListModel, ListRecord } from '../models/ListModel';
import { AbstractStore } from './AbstractStore';

export class ListStore extends AbstractStore<ListModel> {
  async *_watchItems(): AsyncIterable<ListModel[]> {
    for await (const update of this.system.powersync.watch(`select * from ${LIST_TABLE}`, [])) {
      yield update.rows?._array.map((r) => new ListModel(r, this.system)) || this.collection;
    }
  }

  async _load(): Promise<ListModel[]> {
    const records = await this.system.powersync.getAll<ListRecord>(`SELECT * from ${LIST_TABLE}`);
    return records.map((r) => new ListModel(r, this.system));
  }

  async _createModel(record: ListRecord): Promise<ListModel> {
    const { userID } = await this.system.djangoConnector.fetchCredentials();

    const res = await this.system.powersync.execute(
      `INSERT INTO ${LIST_TABLE} (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *`,
      [record.name, record.owner_id || userID]
    );

    const resultRecord = res.rows?.item(0);
    if (!resultRecord) {
      throw new Error('Could not create list');
    }

    return new ListModel(resultRecord, this.system);
  }
}
