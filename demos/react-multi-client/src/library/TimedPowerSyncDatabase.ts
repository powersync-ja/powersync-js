import {
  DBAdapter,
  PowerSyncDatabase,
  PowerSyncDBListener,
  Transaction,
  WebPowerSyncDatabaseOptions,
  PowerSyncBackendConnector
} from '@powersync/web';

export enum OperationType {
  EXECUTE = 'execute',
  READ = 'read',
  WRITE = 'write',
  READ_TX = 'read-transaction',
  WRITE_TX = 'write-transaction'
}

export interface TimedOperation {
  type: OperationType;
  elapsedTime: number;
}

export interface TimedPowerSyncListener extends PowerSyncDBListener {
  operationCompleted: (event: TimedOperation) => void;
}

export class TimedPowerSyncDatabase extends PowerSyncDatabase {
  localKey: string;

  constructor(options: WebPowerSyncDatabaseOptions) {
    super(options);
    this.localKey = `${this.database.name}_connecting`;
  }

  registerListener(listener: Partial<TimedPowerSyncListener>) {
    return super.registerListener(listener);
  }

  async timedExecute(sql: string, parameters?: any[]) {
    return this.timed(() => super.execute(sql, parameters));
  }

  async execute(sql: string, parameters?: any[]) {
    return this.timedOperation(OperationType.EXECUTE, () => super.execute(sql, parameters));
  }

  async getAll<T>(sql: string, parameters?: any[]): Promise<T[]> {
    return this.timedOperation(OperationType.READ, () => super.getAll<T>(sql, parameters));
  }

  async getOptional<T>(sql: string, parameters?: any[]): Promise<T | null> {
    return this.timedOperation(OperationType.READ, () => super.getOptional<T>(sql, parameters));
  }

  async get<T>(sql: string, parameters?: any[]): Promise<T> {
    return this.timedOperation(OperationType.READ, () => super.get<T>(sql, parameters));
  }

  async readTransaction<T>(callback: (tx: Transaction) => Promise<T>, lockTimeout?: number): Promise<T> {
    return this.timedOperation(OperationType.READ_TX, () => super.readTransaction<T>(callback, lockTimeout));
  }

  async timedWriteTransaction<T>(callback: (tx: Transaction) => Promise<T>, lockTimeout?: number) {
    return this.timed(() => super.writeTransaction(callback, lockTimeout));
  }

  async writeTransaction<T>(callback: (tx: Transaction) => Promise<T>, lockTimeout?: number): Promise<T> {
    return this.timedOperation(OperationType.WRITE_TX, () => super.writeTransaction<T>(callback, lockTimeout));
  }

  async readLock<T>(callback: (db: DBAdapter) => Promise<T>) {
    return this.timedOperation(OperationType.READ, () => super.readLock<T>(callback));
  }

  async writeLock<T>(callback: (db: DBAdapter) => Promise<T>) {
    return this.timedOperation(OperationType.WRITE, () => super.writeLock<T>(callback));
  }

  async timedOperation<T>(type: OperationType, operation: () => Promise<T>) {
    const { elapsedTime, result } = await this.timed<T>(operation);
    this.fireOperationComplete({ type, elapsedTime });
    return result;
  }

  async timed<T>(operation: () => Promise<T>) {
    const start = Date.now();
    const result = await operation();
    const elapsedTime = Date.now() - start;
    return { elapsedTime, result };
  }

  async connect(connector: PowerSyncBackendConnector) {
    // We toggle this localStorage key to indicate that we are currently connecting
    // This will fire a `onStorage` event in other tabs, triggering a reconnect if needed
    // We don't need the same for disconnect, as it is triggered with an Abort Signal
    localStorage.setItem(this.localKey, 'true');
    return super.connect(connector).finally(() => {
      localStorage.removeItem(this.localKey);
    });
  }

  fireOperationComplete(event: TimedOperation) {
    this.iterateListeners((l) => l.operationCompleted?.(event));
  }
}
