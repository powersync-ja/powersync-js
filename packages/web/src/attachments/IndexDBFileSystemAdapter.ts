import { AttachmentData, EncodingType, LocalStorageAdapter } from '@powersync/common';

/**
 * IndexDBFileSystemStorageAdapter implements LocalStorageAdapter using IndexedDB.
 * Suitable for web browsers and web-based environments.
 */
export class IndexDBFileSystemStorageAdapter implements LocalStorageAdapter {
  private dbPromise!: Promise<IDBDatabase>;

  constructor(private databaseName: string = 'PowerSyncFiles') {}

  async initialize(): Promise<void> {
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('files');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  clear(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const db = await this.dbPromise;
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  getLocalUri(filename: string): string {
    return `indexeddb://${this.databaseName}/files/${filename}`;
  }

  private async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    const tx = db.transaction('files', mode);
    return tx.objectStore('files');
  }

  async saveFile(filePath: string, data: AttachmentData): Promise<number> {
    const store = await this.getStore('readwrite');

    let dataToStore: ArrayBuffer;
    let size: number;

    if (typeof data === 'string') {
      const binaryString = atob(data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      dataToStore = bytes.buffer;
      size = bytes.byteLength;
    } else {
      dataToStore = data;
      size = dataToStore.byteLength;
    }

    return await new Promise<number>((resolve, reject) => {
      const req = store.put(dataToStore, filePath);
      req.onsuccess = () => resolve(size);
      req.onerror = () => reject(req.error);
    });
  }

  async downloadFile(filePath: string): Promise<Blob> {
    const store = await this.getStore();
    return new Promise<Blob>((resolve, reject) => {
      const req = store.get(filePath);
      req.onsuccess = () => {
        if (req.result) {
          resolve(new Blob([req.result]));
        } else {
          reject(new Error('File not found'));
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async readFile(fileUri: string, options?: { encoding?: EncodingType; mediaType?: string }): Promise<ArrayBuffer> {
    const store = await this.getStore();
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const req = store.get(fileUri);
      req.onsuccess = async () => {
        if (!req.result) {
          reject(new Error('File not found'));
          return;
        }

        resolve(req.result as ArrayBuffer);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFile(uri: string, options?: { filename?: string }): Promise<void> {
    const store = await this.getStore('readwrite');
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(uri);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async fileExists(fileUri: string): Promise<boolean> {
    const store = await this.getStore();
    return new Promise<boolean>((resolve, reject) => {
      const req = store.get(fileUri);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async makeDir(path: string): Promise<void> {
    // No-op for IndexedDB as it does not have a directory structure
  }

  async rmDir(path: string): Promise<void> {
    const store = await this.getStore('readwrite');
    const range = IDBKeyRange.bound(path + '/', path + '/\uffff', false, false);
    await new Promise<void>((resolve, reject) => {
      const req = store.delete(range);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
