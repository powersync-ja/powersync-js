import _ from 'lodash';
import * as Comlink from 'comlink';
import { SharedSyncImplementation } from './SharedSyncImplementation';

const _self: SharedWorkerGlobalScope = self as any;

const sharedSyncImplementation = new SharedSyncImplementation();

_self.onconnect = function (event: MessageEvent<string>) {
  const port = event.ports[0];

  Comlink.expose(sharedSyncImplementation, port);
  sharedSyncImplementation.addPort(port);
};
