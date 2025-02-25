import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AbstractPowerSyncDatabase, PowerSyncDatabase, SyncStreamConnectionMethod } from '@powersync/web';
import { testSchema } from '../../utils/testDb';

describe('PowerSyncDatabase', () => {
  let db: PowerSyncDatabase;
  let mockConnector: any;
  let mockLogger: any;
  let mockSyncImplementation: any;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      warn: vi.fn()
    };

    // Initialize with minimal required options
    db = new PowerSyncDatabase({
      schema: testSchema,
      database: {
        dbFilename: 'test.db'
      },
      logger: mockLogger
    });

    vi.spyOn(db as any, 'runExclusive').mockImplementation((cb: any) => cb());

    vi.spyOn(AbstractPowerSyncDatabase.prototype, 'connect').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should log debug message when attempting to connect', async () => {
      await db.connect(mockConnector);
      expect(mockLogger.debug).toHaveBeenCalledWith('Attempting to connect to PowerSync instance');
      expect(db['runExclusive']).toHaveBeenCalled();
    });

    it('should use connect with correct options', async () => {
      await db.connect(mockConnector, {
        retryDelayMs: 1000,
        crudUploadThrottleMs: 2000,
        params: {
          param1: 1
        },
        connectionMethod: SyncStreamConnectionMethod.HTTP
      });

      expect(AbstractPowerSyncDatabase.prototype.connect).toHaveBeenCalledWith(mockConnector, {
        retryDelayMs: 1000,
        crudUploadThrottleMs: 2000,
        connectionMethod: 'http',
        params: {
          param1: 1
        }
      });
    });
  });
});
