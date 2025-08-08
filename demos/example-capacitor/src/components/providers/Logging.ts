import { BaseObserver, ControlledExecutor, createBaseLogger, LogLevel } from '@powersync/web';

export type LogRecord = {
  level: string;
  timestamp: string;
  message: string;
};

export type LogListener = {
  logsUpdated: (logs: ReadonlyArray<Readonly<LogRecord>>) => void;
};

export class LogStorage extends BaseObserver<LogListener> {
  protected _logs: LogRecord[];
  protected writeExecutor: ControlledExecutor<void>;
  protected dbPromise: Promise<IDBDatabase>;

  static readonly LOGS_DB_NAME = '_ps_logs_db';
  static readonly LOGS_STORE_NAME = 'logs';

  get logs(): ReadonlyArray<Readonly<LogRecord>> {
    return this._logs;
  }

  constructor() {
    super();
    this._logs = [];
    this.writeExecutor = new ControlledExecutor<void>(() => this.saveLogsToIndexedDB());
    this.dbPromise = this.openLogsDB();
    this.readLogsFromIndexedDB();
  }

  clearLogs() {
    this._logs = [];
    this.iterateListeners((l) => l.logsUpdated?.(this.logs));
  }

  writeLog(record: LogRecord) {
    this._logs.unshift(record);
    this.iterateListeners((l) => l.logsUpdated?.(this.logs));
    this.writeExecutor.schedule();
  }

  private async saveLogsToIndexedDB() {
    const db = await this.dbPromise;
    const tx = db.transaction(LogStorage.LOGS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(LogStorage.LOGS_STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        this.logs.forEach((log) => store.add(log));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  }

  // Read all LogRecord entries from IndexedDB
  private async readLogsFromIndexedDB(): Promise<LogRecord[]> {
    const db = await this.dbPromise;
    const tx = db.transaction(LogStorage.LOGS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(LogStorage.LOGS_STORE_NAME);
    return new Promise<LogRecord[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        this._logs = (req.result as any[])
          .map(({ id, ...rest }) => rest)
          // sort in descending order
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(this._logs);
        this.iterateListeners((l) => l.logsUpdated?.(this.logs));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Helper to open the IndexedDB database
  private async openLogsDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(LogStorage.LOGS_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LogStorage.LOGS_STORE_NAME)) {
          db.createObjectStore(LogStorage.LOGS_STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const LOG_STORAGE = new LogStorage();

const mapLogParam = (param: any) => {
  if (param instanceof Error) {
    return `    
Error
Name: ${param.name}
Message: ${param.message}
Cause: ${param.cause}
Stack: ${param.stack}
    `.trim();
  }
  return JSON.stringify(param);
};

// Configure base logger for global settings
const logger = createBaseLogger();
logger.useDefaults({
  defaultLevel: LogLevel.DEBUG,
  formatter: (messages, context) => {
    LOG_STORAGE.writeLog({
      level: context.level.name,
      message: messages.map(mapLogParam).join(' -- '),
      timestamp: new Date().toISOString()
    });
  }
});
