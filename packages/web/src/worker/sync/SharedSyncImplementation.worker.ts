import { createBaseLogger } from '@powersync/common';
import * as Comlink from 'comlink';
import {
  SharedSyncClientEvent,
  SharedSyncImplementation,
  type ManualSharedSyncPayload
} from './SharedSyncImplementation';

const _self: SharedWorkerGlobalScope = self as any;
const logger = createBaseLogger();
logger.useDefaults();

const sharedSyncImplementation = new SharedSyncImplementation();

_self.onconnect = async function (event: MessageEvent<string>) {
  const port = event.ports[0];

  /**
   * Adds an extra listener which can remove this port
   * from the list of monitored ports.
   */
  port.addEventListener('message', async (event) => {
    const payload = event.data as ManualSharedSyncPayload;
    if (payload?.event == SharedSyncClientEvent.CLOSE_CLIENT) {
      const release = await sharedSyncImplementation.removePort(port);
      port.postMessage({
        event: SharedSyncClientEvent.CLOSE_ACK,
        data: {}
      } satisfies ManualSharedSyncPayload);
      release?.();
    }
  });

  await sharedSyncImplementation.addPort(port);
  Comlink.expose(sharedSyncImplementation, port);
};
