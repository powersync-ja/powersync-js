import { DBAdapter, SQLOpenFactory } from '@powersync/common';
import { SQLJSDBAdapter, SQLJSOpenOptions, ResolvedSQLJSOpenOptions, SQLJSPersister } from '@powersync/common/dev';

export class WebSQLJSOpenFactory implements SQLOpenFactory {
  constructor(protected options: SQLJSOpenOptions) {}

  openDB(): DBAdapter {
    return new WebSQLJSDBAdapter(this.options);
  }
}

export class WebSQLJSDBAdapter extends SQLJSDBAdapter {
  protected resolveSQLJSOpenOptions(options: SQLJSOpenOptions): ResolvedSQLJSOpenOptions {
    return {
      persister: new IndexedDBPersister(options.dbFilename),
      ...options
    };
  }
}

export class IndexedDBPersister implements SQLJSPersister {
  private dbName: string;
  private storeName: string;
  private dbFilename: string;

  constructor(dbFilename: string, dbName = 'SQLiteDB', storeName = 'files') {
    this.dbFilename = dbFilename;
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async readFile(): Promise<ArrayLike<number> | Buffer | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(this.dbFilename);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve(new Uint8Array(result));
          } else {
            resolve(null);
          }
        };
      });
    } catch (error) {
      console.error('Error reading from IndexedDB:', error);
      return null;
    }
  }

  async writeFile(data: ArrayLike<number> | Buffer): Promise<void> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Convert data to ArrayBuffer for storage
      const arrayBuffer = new Uint8Array(data).buffer;

      return new Promise((resolve, reject) => {
        const request = store.put(arrayBuffer, this.dbFilename);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.error('Error writing to IndexedDB:', error);
      throw error;
    }
  }
}
