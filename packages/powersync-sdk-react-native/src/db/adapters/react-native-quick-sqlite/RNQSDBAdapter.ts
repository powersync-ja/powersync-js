import { BaseObserver, DBAdapter, DBAdapterListener, Transaction } from '@journeyapps/powersync-sdk-common';
import { QuickSQLiteConnection } from '@journeyapps/react-native-quick-sqlite';

/**
 * Adapter for React Native Quick SQLite
 * This will be updated more once we implement concurrent transactions
 */
export class RNQSDBAdapter extends BaseObserver<DBAdapterListener> implements DBAdapter {
  constructor(protected baseDB: QuickSQLiteConnection) {
    super();
    // link table update commands
    baseDB.registerUpdateHook((update) => {
      this.iterateListeners((cb) => cb.tablesUpdated?.(update));
    });
  }

  close() {
    return this.baseDB.close();
  }

  transaction(fn: (tx: Transaction) => void | Promise<void>) {
    return this.baseDB.transaction(fn);
  }

  execute(query: string, params?: any[]) {
    return this.baseDB.execute(query, params);
  }

  executeAsync(query: string, params?: any[]) {
    return this.baseDB.executeAsync(query, params);
  }
}
