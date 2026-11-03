import { BroadcastChannel } from 'node:worker_threads';
import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  DiagnosticsEvent,
  LockOptions,
  LockType,
  Mutex
} from '@powersync/shared-internals';

/**
 * Global locks which prevent multiple instances from syncing
 * concurrently.
 */
const LOCKS = new Map<string, Map<LockType, Mutex>>();

export class NodeStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  locks!: Map<LockType, Mutex>; // initialized by initLocks()
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
   * Broadcasts a core diagnostics event on a channel for diagnostics tooling in this process to
   * consume. The channel does not keep the process alive.
   */
  protected override emitDiagnostics(event: DiagnosticsEvent): void {
    if (!this.diagnosticsChannel) {
      this.diagnosticsChannel = new BroadcastChannel('powersync-diagnostics-events');
      this.diagnosticsChannel.unref();
    }
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
