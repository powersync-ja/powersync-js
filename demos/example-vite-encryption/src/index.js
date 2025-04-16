import { column, Schema, Table, PowerSyncDatabase, createBaseLogger, LogLevels } from '@powersync/web';

const defaultLogger = createBaseLogger();
defaultLogger.useDefaults();
defaultLogger.setLevel(LogLevels.DEBUG);

const customers = new Table({ name: column.text });

export const AppSchema = new Schema({ customers });

let PowerSync;

const openDatabase = async (encryptionKey) => {
  PowerSync = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'example-encryption.db' },
    encryptionKey: encryptionKey
  });

  await PowerSync.init();

  // Run local statements.
  await PowerSync.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', ['Fred']);

  const result = await PowerSync.getAll('SELECT * FROM customers');
  console.log('contents of customers: ', result);
  console.table(result);
};

document.addEventListener('DOMContentLoaded', async (event) => {
  let encryptionKey = '';

  while (!encryptionKey) {
    encryptionKey = prompt('Enter encryption key (non-empty string):');
  }

  openDatabase(encryptionKey);
});
