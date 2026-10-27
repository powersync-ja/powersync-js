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

export class ReactNativeStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  locks!: Map<LockType, Mutex>;
  private diagnosticsChannel?: BroadcastChannel;

  constructor(options: AbstractStreamingSyncImplementationOptions) {
    super(options);
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

  /**
   * Broadcasts a core diagnostics event for diagnostics tooling in the app to consume. Hermes has no
   * `BroadcastChannel`; the tooling provides one in development, so without it this does nothing.
   */
  protected override emitDiagnostics(event: DiagnosticsEvent): void {
    if (typeof BroadcastChannel !== 'function') return;
    this.diagnosticsChannel ??= new BroadcastChannel('powersync-diagnostics-events');
    this.diagnosticsChannel.postMessage(event);
  }

  override async dispose(): Promise<void> {
    await super.dispose();
    this.diagnosticsChannel?.close();
    this.diagnosticsChannel = undefined;
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
