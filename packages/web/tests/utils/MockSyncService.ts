// Re-export types and worker-side implementation for backward compatibility
export * from '../../src/worker/sync/MockSyncServiceTypes';
export {
  MockSyncService,
  getMockSyncService,
  setupMockServiceMessageHandler
} from '../../src/worker/sync/MockSyncServiceWorker';

// Re-export client-side utilities
export * from './MockSyncServiceClient';
