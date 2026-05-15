import { LogLevels, LogRecord, PowerSyncDatabase } from '@powersync/web';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TEST_SCHEMA } from '../../utils/test-schema.js';

describe('PowerSyncDatabase', () => {
  let db: PowerSyncDatabase;
  let mockConnector: any;
  let mockLogger: Mock<(record: LogRecord) => void>;

  beforeEach(() => {
    mockLogger = vi.fn();

    // Initialize with minimal required options
    db = new PowerSyncDatabase({
      schema: TEST_SCHEMA,
      database: {
        dbFilename: 'test.db'
      },
      logger: { log: mockLogger }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should log debug message when attempting to connect', async () => {
      await db.connect(mockConnector);
      expect(mockLogger).toHaveBeenCalledWith({
        level: LogLevels.debug,
        message: 'Attempting to connect to PowerSync instance'
      });
    });
  });
});
