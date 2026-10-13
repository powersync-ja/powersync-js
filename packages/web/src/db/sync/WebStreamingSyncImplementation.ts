import { LogLevels } from '@powersync/common';
import {
  AbstractStreamingSyncImplementation,
  AbstractStreamingSyncImplementationOptions,
  DiagnosticsEvent,
  LockOptions,
  LockType
} from '@powersync/shared-internals';
import { getNavigatorLocks } from '../../shared/navigator.js';

export interface WebStreamingSyncImplementationOptions extends AbstractStreamingSyncImplementationOptions {
  sync?: {
    worker?: string | URL | (() => SharedWorker);
  };
}

export class WebStreamingSyncImplementation extends AbstractStreamingSyncImplementation {
  private diagnosticsChannel?: BroadcastChannel;

  constructor(options: WebStreamingSyncImplementationOptions) {
    // Super will store and provide default values for options
    super(options);
  }

  /**
   * Broadcasts a core diagnostics event on a same-origin channel for diagnostics tooling to consume.
   * The channel reaches the page even when sync runs in a shared worker.
   */
  protected override emitDiagnostics(event: DiagnosticsEvent): void {
    this.diagnosticsChannel ??= new BroadcastChannel('powersync-diagnostics-events');
    this.diagnosticsChannel.postMessage(event);
  }

  override async dispose(): Promise<void> {
    await super.dispose();
    this.diagnosticsChannel?.close();
    this.diagnosticsChannel = undefined;
  }

  get webOptions(): WebStreamingSyncImplementationOptions {
    return this.options as WebStreamingSyncImplementationOptions;
  }

  async obtainLock<T>(lockOptions: LockOptions<T>): Promise<T> {
    const identifier = `streaming-sync-${lockOptions.type}-${this.webOptions.identifier}`;
    if (lockOptions.type == LockType.SYNC) {
      this.logger.log({ level: LogLevels.debug, message: `requesting lock for ${identifier}` });
    }
    return getNavigatorLocks().request(identifier, { signal: lockOptions.signal }, lockOptions.callback);
  }
}
