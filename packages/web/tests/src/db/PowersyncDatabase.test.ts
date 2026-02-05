import { createLogger, PowerSyncDatabase } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testSchema } from '../../utils/testDb.js';

describe('PowerSyncDatabase', () => {
  let db: PowerSyncDatabase;
  let mockConnector: any;
  let mockLogger: any;
  let mockSyncImplementation: any;

  beforeEach(() => {
    const logger = createLogger('test');
    mockLogger = {
      debug: vi.spyOn(logger, 'debug'),
      warn: vi.spyOn(logger, 'warn')
    };

    // Initialize with minimal required options
    db = new PowerSyncDatabase({
      schema: testSchema,
      database: {
        dbFilename: 'test.db'
      },
      logger
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should log debug message when attempting to connect', async () => {
      await db.connect(mockConnector);
      expect(mockLogger.debug).toHaveBeenCalledWith('Attempting to connect to PowerSync instance');
    });
  });
});
