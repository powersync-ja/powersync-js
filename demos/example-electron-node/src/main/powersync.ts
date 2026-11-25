import { column, Schema, Table, type Authenticator, type MutationUploader } from '@powersync/node';

export class BackendConnector implements Authenticator {
  constructor(private readonly powersyncToken: string) {}

  async resolveCredentials(): Promise<string> {
    // This token is for development only.
    // For production applications, integrate with an auth provider or custom auth.
    return this.powersyncToken;
  }

  readonly upload: MutationUploader = async ({ database }) => {
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
  };
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
