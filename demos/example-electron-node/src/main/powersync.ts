import { AbstractPowerSyncDatabase, column, PowerSyncBackendConnector, Schema, Table } from '@powersync/node';

declare const POWERSYNC_URL: string|null;
declare const POWERSYNC_TOKEN: string|null;

export class BackendConnector implements PowerSyncBackendConnector {
  private powersyncUrl: string | undefined;
  private powersyncToken: string | undefined;

  constructor() {
    this.powersyncUrl = POWERSYNC_URL;
    // This token is for development only.
    // For production applications, integrate with an auth provider or custom auth.
    this.powersyncToken = POWERSYNC_TOKEN;
  }

  async fetchCredentials() {
    // TODO: Use an authentication service or custom implementation here.
    if (this.powersyncToken == null || this.powersyncUrl == null) {
      return null;
    }

    return {
      endpoint: this.powersyncUrl,
      token: this.powersyncToken
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    try {
      // TODO: Upload here

      await transaction.complete();
    } catch (error: any) {
      if (shouldDiscardDataOnError(error)) {
        // Instead of blocking the queue with these errors, discard the (rest of the) transaction.
        //
        // Note that these errors typically indicate a bug in the application.
        // If protecting against data loss is important, save the failing records
        // elsewhere instead of discarding, and/or notify the user.
        console.error(`Data upload error - discarding`, error);
        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error or temporary server error.
        // Throwing an error here causes this call to be retried after a delay.
        throw error;
      }
    }
  }
}

function shouldDiscardDataOnError(error: any) {
  // TODO: Ignore non-retryable errors here
  return false;
}


export const LIST_TABLE = 'lists';
export const TODO_TABLE = 'todos';

const todos = new Table(
  {
    list_id: column.text,
    created_at: column.text,
    completed_at: column.text,
    description: column.text,
    created_by: column.text,
    completed_by: column.text,
    completed: column.integer,
    photo_id: column.text
  },
  { indexes: { list: ['list_id'] } }
);

const lists = new Table({
  created_at: column.text,
  name: column.text,
  owner_id: column.text
});

export const AppSchema = new Schema({
  lists,
  todos
});

export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
export type ListRecord = Database['lists'];
