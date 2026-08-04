import type { ILogger } from '@powersync/common';

export function logWorkerErrors(worker: AbstractWorker, logger: ILogger) {
  function logError(event: ErrorEvent) {
    logger.error('Error in database or sync worker, this likely disrupts PowerSync.', event.error);
  }

  worker.addEventListener('error', logError);
}
