import _ from 'lodash';
import { AbstractModel, ModelRecord } from './AbstractModel';
import { Transaction } from '@journeyapps/powersync-sdk-react-native';

export interface TodoRecord extends ModelRecord {
  created_at: string;
  completed: boolean;
  description: string;
  completed_at?: string;

  created_by: string;
  completed_by?: string;
  list_id: string;
}

export const TODO_TABLE = 'api_todo';

export class TodoModel extends AbstractModel<TodoRecord> {
  get table() {
    return TODO_TABLE;
  }

  async update(record: TodoRecord): Promise<void> {
    await this.system.powersync.execute(
      `UPDATE ${this.table} SET created_at = ?, completed = ?, completed_at = ?, description = ?, created_by = ?, completed_by = ?, list_id = ? WHERE id = ?`,
      [
        record.created_at,
        record.completed,
        record.completed_at,
        record.description,
        record.created_by,
        record.completed_by,
        record.list_id,
        record.id
      ]
    );
    _.merge(this.record, record);
  }

  async toggleCompletion(completed: boolean) {
    const { userID } = await this.system.djangoConnector.fetchCredentials();

    return this.update({
      ...this.record,
      completed_at: completed ? new Date().toISOString() : undefined,
      completed,
      completed_by: completed ? userID : undefined
    });
  }

  async _delete(tx: Transaction): Promise<void> {
    await tx.execute(`DELETE FROM  ${this.table} WHERE id = ?`, [this.id]);
    this.system.todoStore.removeModel(this);
  }
}
