import { column, Schema, Table, PowerSyncDatabase } from '@powersync/web';
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

const customers = new Table({ first_name: column.text, last_name: column.text, full_name: column.text });

export const AppSchema = new Schema({ customers }, ({ getInternalName }) => [
  `DROP TRIGGER IF EXISTS compute_full_name`,
  `DROP TRIGGER IF EXISTS update_full_name`,

  `
  CREATE TRIGGER compute_full_name 
  AFTER INSERT ON ${getInternalName('customers')}
   BEGIN
     UPDATE customers 
     SET full_name = first_name || ' ' || last_name
     WHERE id = NEW.id;
   END;
  `,
  `
  CREATE TRIGGER update_full_name 
  AFTER UPDATE OF data ON ${getInternalName('customers')}
   BEGIN
     UPDATE customers 
     SET full_name = first_name || ' ' || last_name
     WHERE id = NEW.id AND full_name != (first_name || ' ' || last_name);
   END;
  `
]);

let PowerSync;

const openDatabase = async () => {
  PowerSync = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'test.sqlite' }
  });

  await PowerSync.init();

  await PowerSync.execute('DELETE FROM customers');

  await PowerSync.execute('INSERT INTO customers(id, first_name, last_name) VALUES(uuid(), ?, ?)', ['John', 'Doe']);

  const result = await PowerSync.getAll('SELECT * FROM customers');

  console.log('Contents of customers after insert: ', result);

  await PowerSync.execute('UPDATE customers SET first_name = ?', ['Jane']);

  const result2 = await PowerSync.getAll('SELECT * FROM customers');

  console.log('Contents of customers after update: ', result2);

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
