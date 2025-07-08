## In-memory persistor

```tsx
  persister: {
          // TODO
          readFile: async () => null,
          writeFile: async () => {}
        }
```

## Expo Persistor

```tsx
const createSQLJSPersister = (dbFilename: string): SQLJSPersister => {
  const dbPath = `${FileSystem.documentDirectory}${dbFilename}`;

  return {
    readFile: async (): Promise<ArrayLike<number> | Buffer | null> => {
      try {
        console.warn('Reading database file fromaa:', dbPath);
        const fileInfo = await FileSystem.getInfoAsync(dbPath);
        if (!fileInfo.exists) {
          return null;
        }

        const result = await FileSystem.readAsStringAsync(dbPath, {
          encoding: FileSystem.EncodingType.Base64
        });

        // Convert base64 to Uint8Array
        const binary = atob(result);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch (error) {
        console.error('Error reading database file:', error);
        return null;
      }
    },

    writeFile: async (data: ArrayLike<number> | Buffer): Promise<void> => {
      try {
        // Convert to Uint8Array
        const uint8Array = new Uint8Array(data);

        // Convert to base64
        const binary = Array.from(uint8Array, (byte) => String.fromCharCode(byte)).join('');
        const base64 = btoa(binary);

        await FileSystem.writeAsStringAsync(dbPath, base64, {
          encoding: FileSystem.EncodingType.Base64
        });
        console.warn('Wrote database file :', dbPath);
      } catch (error) {
        console.error('Error writing database file:', error);
        throw error;
      }
    }
  };
};
```

## Web Persistor

```tsx
class IndexedDBPersister implements SQLJSPersister {
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

// Factory function
function createIndexedDBPersister(dbFilename: string): SQLJSPersister {
  return new IndexedDBPersister(dbFilename);
}

const persister = createIndexedDBPersister('powersync.db');
```
