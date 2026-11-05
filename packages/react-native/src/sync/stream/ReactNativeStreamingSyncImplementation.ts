import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  DiagnosticsEvent,
  LockOptions,
  LockType
} from '@powersync/shared-internals';
import { Mutex } from '@powersync/shared-internals';

/**
 * Global locks which prevent multiple instances from syncing
 * concurrently.
 */
const LOCKS = new Map<string, Map<LockType, Mutex>>();

export interface ReactNativeStreamingSyncImplementationOptions extends AbstractStreamingSyncImplementationOptions {
  /** Receives core diagnostics events, emitted when the connection has diagnostics enabled. */
  onDiagnostics?: (event: DiagnosticsEvent) => void;
}

export class ReactNativeStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  locks!: Map<LockType, Mutex>;
  private onDiagnostics?: (event: DiagnosticsEvent) => void;

  constructor(options: ReactNativeStreamingSyncImplementationOptions) {
    super(options);
    this.onDiagnostics = options.onDiagnostics;
    this.initLocks();
  }

  /**
   *  Configures global locks on sync process
   */
  initLocks() {
    const { identifier } = this.options;
    if (identifier && LOCKS.has(identifier)) {
      this.locks = LOCKS.get(identifier)!;
      return;
    }

    this.locks = new Map<LockType, Mutex>();
    this.locks.set(LockType.CRUD, new Mutex());
    this.locks.set(LockType.SYNC, new Mutex());

    if (identifier) {
      LOCKS.set(identifier, this.locks);
    }
  }

  protected override emitDiagnostics(event: DiagnosticsEvent): void {
    this.onDiagnostics?.(event);
  }

  obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const lock = this.locks.get(lockOptions.type);
    if (!lock) {
      throw new Error(`Lock type ${lockOptions.type} not found`);
    }
    return lock.runExclusive(async () => {
      return lockOptions.callback();
    }, lockOptions.signal);
  }
}
