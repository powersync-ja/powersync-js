import { Schema, Table, PowerSyncDatabase, column } from '@powersync/web';
import Logger from 'js-logger';

Logger.useDefaults();

/**
 * A placeholder connector which doesn't do anything.
 * This is just used to verify that the sync workers can be loaded
 * when connecting.
 */
class DummyConnector {
  async fetchCredentials() {
    return {
      endpoint: '',
      token: ''
    };
  }

  async uploadData(database) {}
}

const customers = new Table({ name: column.text })

export const AppSchema = new Schema({ customers });

let PowerSync;

const openDatabase = async () => {
  PowerSync = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'test.sqlite' }
  });

  await PowerSync.init();

  // Run local statements.
  await PowerSync.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', ['Fred']);

  const result = await PowerSync.getAll('SELECT * FROM customers');
  console.log('contents of customers: ', result);

  console.log(
    `Attempting to connect in order to verify web workers are correctly loaded.
    This doesn't use any actual network credentials.
    Network errors will be shown: these can be ignored.`
  );

  /**
   * Try and connect, this will setup shared sync workers
   * This will fail due to not having a valid endpoint,
   * but it will try - which is all that matters.
   */
  await PowerSync.connect(new DummyConnector());
};

document.addEventListener('DOMContentLoaded', (event) => {
  openDatabase();
});
