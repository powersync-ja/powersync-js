import { createBaseLogger } from '@powersync/common';
import { SharedSyncImplementation } from './SharedSyncImplementation';
import { WorkerClient } from './WorkerClient';

const _self: SharedWorkerGlobalScope = self as any;
const logger = createBaseLogger();
logger.useDefaults();

const sharedSyncImplementation = new SharedSyncImplementation();

_self.onconnect = async function (event: MessageEvent<string>) {
  const port = event.ports[0];
  new WorkerClient(sharedSyncImplementation, port);
};
