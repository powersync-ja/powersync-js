import {
  Column,
  ColumnType,
  WASQLitePowerSyncDatabaseOpenFactory,
  Schema,
  Table
} from '@journeyapps/powersync-sdk-web';

export const AppSchema = new Schema([
  new Table({ name: 'customers', columns: [new Column({ name: 'name', type: ColumnType.TEXT })] })
]);

let PowerSync;

const openDatabase = async () => {
  PowerSync = new WASQLitePowerSyncDatabaseOpenFactory({
    schema: AppSchema,
    dbFilename: 'test.sqlite',
    flags: {
      // This is disabled once CSR+SSR functionality is verified to be working correctly
      disableSSRWarning: true
    }
  }).getInstance();

  await PowerSync.init();

  // Run local statements.
  await PowerSync.execute('INSERT INTO customers(id, name) VALUES(uuid(), ?)', ['Fred']);

  const result = await PowerSync.getAll('SELECT * FROM customers');
  console.log('contents of customers: ', result);
};

document.addEventListener('DOMContentLoaded', (event) => {
  openDatabase();
});
