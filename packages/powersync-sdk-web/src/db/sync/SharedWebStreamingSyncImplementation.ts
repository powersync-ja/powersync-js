import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import * as Comlink from 'comlink';
import {
  WebStreamingSyncImplementation,
  WebStreamingSyncImplementationOptions
} from './WebStreamingSyncImplementation';
import {
  SharedSyncImplementation,
  SharedSyncMessage,
  SharedSyncMessageType,
  SharedSyncStatus
} from '../../worker/sync/SharedSyncImplementation';

export class SharedWebStreamingSyncImplementation extends WebStreamingSyncImplementation {
  protected stateManager: Comlink.Remote<SharedSyncImplementation>;

  /**
   * ID for the tab running this sync implementation
   */
  protected syncTabId: string;

  constructor(options: WebStreamingSyncImplementationOptions) {
    super(options);

    this.syncTabId = uuid();
    const worker = new SharedWorker(new URL('../../worker/sync/SharedSyncImplementation.worker.js', import.meta.url), {
      /* @vite-ignore */
      name: `shared-sync-${this.webOptions.identifier}`,
      type: 'module'
    });

    const { port } = worker;
    this.stateManager = Comlink.wrap<SharedSyncImplementation>(port);

    port.onmessage = (event: MessageEvent<SharedSyncMessage>) => {
      const {
        data: { type, payload }
      } = event;
      if (type !== SharedSyncMessageType.UPDATE || payload.tabId == this.syncTabId) {
        // Don't update from own updates
        return;
      }
      // Don't broadcast this to the shared implementation
      this.internalUpdateStatus(payload);
    };

    // Load the initial state
    this.stateManager.getState().then((state) => {
      this.internalUpdateStatus(state);
    });
  }

  /**
   * Triggers update of sync status without broadcasting to shared sync
   * manager
   */
  protected internalUpdateStatus(state: SharedSyncStatus) {
    return super.updateSyncStatus(state);
  }

  protected updateSyncStatus(state: SharedSyncStatus): void {
    super.updateSyncStatus(state);
    // Broadcast this update to shared sync manager
    this.stateManager.updateState({
      ...state,
      tabId: this.syncTabId
    });
  }
}
