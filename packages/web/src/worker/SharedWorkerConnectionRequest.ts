export type WorkerService = 'database' | 'sync';

export interface SharedWorkerConnectionRequest {
  service: WorkerService;
  port: MessagePort;
}
