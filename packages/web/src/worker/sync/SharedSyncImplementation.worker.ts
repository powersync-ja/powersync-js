import * as Comlink from 'comlink';
import {
  SharedSyncImplementation,
  SharedSyncClientEvent,
  type ManualSharedSyncPayload
} from './SharedSyncImplementation';
import Logger from 'js-logger';

const _self: SharedWorkerGlobalScope = self as any;
Logger.useDefaults();
const sharedSyncImplementation = new SharedSyncImplementation();

_self.onconnect = function (event: MessageEvent<string>) {
  const port = event.ports[0];

  /**
   * Adds an extra listener which can remove this port
   * from the list of monitored ports.
   */
  port.addEventListener('message', (event) => {
    const payload = event.data as ManualSharedSyncPayload;
    if (payload?.event == SharedSyncClientEvent.CLOSE_CLIENT) {
      console.log('closing shared for port', port);
      sharedSyncImplementation.removePort(port);
    }
  });

  Comlink.expose(sharedSyncImplementation, port);
  sharedSyncImplementation.addPort(port);
};
