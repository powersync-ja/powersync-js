import _ from 'lodash';
import { AbstractModel, ModelRecord } from './AbstractModel';
import { Transaction } from '@journeyapps/powersync-sdk-react-native';

export interface ListRecord extends ModelRecord {
  name: string;
  created_at: string;
  owner_id: string;
}

export const LIST_TABLE = 'api_list';

export class ListModel extends AbstractModel<ListRecord> {
  get table() {
    return LIST_TABLE;
  }

  get todos() {
    return this.system.todoStore.collection.filter((todo) => todo.record.list_id == this.id);
  }

  get description() {
    const todos = this.todos;
    const completedCount = _.sumBy(todos, (todo) => (todo.record.completed ? 1 : 0));
    return `${todos.length - completedCount} pending, ${completedCount} completed`;
  }

  async update(record: ListRecord): Promise<void> {
    await this.system.powersync.execute(
      `UPDATE ${this.table} SET name = ?, created_at = ?, owner_id = ? WHERE id = ?`,
      [record.name, record.created_at, record.owner_id, this.id]
    );
    _.merge(this.record, record);
  }

  async _delete(tx: Transaction): Promise<void> {
    for (const todo of this.todos) {
      await todo.delete(tx);
    }
    await tx.execute(`DELETE FROM ${this.table} WHERE id = ?`, [this.id]);
    this.system.listStore.removeModel(this);
  }
}
