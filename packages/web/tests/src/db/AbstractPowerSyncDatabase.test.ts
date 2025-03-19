import { describe, it, expect, vi } from 'vitest';
import {
  AbstractPowerSyncDatabase,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_CRUD_UPLOAD_THROTTLE_MS,
  BucketStorageAdapter,
  DBAdapter,
  PowerSyncBackendConnector,
  PowerSyncDatabaseOptionsWithSettings,
  RequiredAdditionalConnectionOptions,
  StreamingSyncImplementation
} from '@powersync/common';
import { testSchema } from '../../utils/testDb';

class TestPowerSyncDatabase extends AbstractPowerSyncDatabase {
  protected openDBAdapter(options: PowerSyncDatabaseOptionsWithSettings): DBAdapter {
    return {} as any;
  }
  protected generateSyncStreamImplementation(
    connector: PowerSyncBackendConnector,
    options: RequiredAdditionalConnectionOptions
  ): StreamingSyncImplementation {
    return undefined as any;
  }
  protected generateBucketStorageAdapter(): BucketStorageAdapter {
    return {
      init: vi.fn()
    } as any;
  }
  _initialize(): Promise<void> {
    return Promise.resolve();
  }

  get database() {
    return {
      get: vi.fn().mockResolvedValue({ version: '0.3.11' }),
      getAll: vi.fn().mockResolvedValue([]),
      execute: vi.fn(),
      refreshSchema: vi.fn()
    } as any;
  }
  // Expose protected method for testing
  public testResolvedConnectionOptions(options?: any) {
    return this.resolvedConnectionOptions(options);
  }
}

describe('AbstractPowerSyncDatabase', () => {
  describe('resolvedConnectionOptions', () => {
    it('should use connect options when provided', () => {
      const db = new TestPowerSyncDatabase({
        schema: testSchema,
        database: { dbFilename: 'test.db' }
      });

      const result = db.testResolvedConnectionOptions({
        retryDelayMs: 1000,
        crudUploadThrottleMs: 2000
      });

      expect(result).toEqual({
        retryDelayMs: 1000,
        crudUploadThrottleMs: 2000
      });
    });

    it('should fallback to constructor options when connect options not provided', () => {
      const db = new TestPowerSyncDatabase({
        schema: testSchema,
        database: { dbFilename: 'test.db' },
        retryDelayMs: 3000,
        crudUploadThrottleMs: 4000
      });

      const result = db.testResolvedConnectionOptions();

      expect(result).toEqual({
        retryDelayMs: 3000,
        crudUploadThrottleMs: 4000
      });
    });

    it('should convert retryDelay to retryDelayMs', () => {
      const db = new TestPowerSyncDatabase({
        schema: testSchema,
        database: { dbFilename: 'test.db' },
        retryDelay: 5000
      });

      const result = db.testResolvedConnectionOptions();

      expect(result).toEqual({
        retryDelayMs: 5000,
        crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
      });
    });

    it('should prioritize retryDelayMs over retryDelay in constructor options', () => {
      const db = new TestPowerSyncDatabase({
        schema: testSchema,
        database: { dbFilename: 'test.db' },
        retryDelay: 5000,
        retryDelayMs: 6000
      });

      const result = db.testResolvedConnectionOptions();

      expect(result).toEqual({
        retryDelayMs: 6000,
        crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
      });
    });

    it('should prioritize connect options over constructor options', () => {
      const db = new TestPowerSyncDatabase({
        schema: testSchema,
        database: { dbFilename: 'test.db' },
        retryDelayMs: 5000,
        crudUploadThrottleMs: 6000
      });

      const result = db.testResolvedConnectionOptions({
        retryDelayMs: 7000,
        crudUploadThrottleMs: 8000
      });

      expect(result).toEqual({
        retryDelayMs: 7000,
        crudUploadThrottleMs: 8000
      });
    });

    it('should use default values when no options provided', () => {
      const db = new TestPowerSyncDatabase({
        schema: testSchema,
        database: { dbFilename: 'test.db' }
      });

      const result = db.testResolvedConnectionOptions();

      expect(result).toEqual({
        retryDelayMs: DEFAULT_RETRY_DELAY_MS,
        crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
      });
    });

    it('should handle partial connect options', () => {
      const db = new TestPowerSyncDatabase({
        schema: testSchema,
        database: { dbFilename: 'test.db' },
        retryDelayMs: 5000,
        crudUploadThrottleMs: 6000
      });

      const result = db.testResolvedConnectionOptions({
        retryDelayMs: 7000
      });

      expect(result).toEqual({
        retryDelayMs: 7000,
        crudUploadThrottleMs: 6000
      });
    });
  });
});
