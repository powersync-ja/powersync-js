import { TODO_TABLE, TodoModel, TodoRecord } from '../models/TodoModel';
import { AbstractStore } from './AbstractStore';

export class TodoStore extends AbstractStore<TodoModel> {
  async *_watchItems(): AsyncIterable<TodoModel[]> {
    for await (const update of this.system.powersync.watch(`select * from ${TODO_TABLE}`, [], {
      tables: [TODO_TABLE]
    })) {
      yield update.rows?._array.map((r) => new TodoModel(r, this.system)) || this.collection;
    }
  }

  async _createModel(record: TodoRecord): Promise<TodoModel> {
    const { userID } = await this.system.djangoConnector.fetchCredentials();

    await this.system.powersync.execute(
      `INSERT INTO ${TODO_TABLE} (id, created_at, completed, completed_at, description, created_by, completed_by, list_id) VALUES (uuid(), datetime(), ?, ?, ?, ?, ?, ?)`,
      [
        record.completed,
        record.completed_at,
        record.description,
        record.created_by ?? userID,
        record.completed_by,
        record.list_id
      ]
    );

    return new TodoModel(record, this.system);
  }
}
