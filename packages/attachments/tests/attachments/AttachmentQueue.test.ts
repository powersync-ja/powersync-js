import * as commonSdk from '@powersync/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbstractAttachmentQueue } from '../../src/AbstractAttachmentQueue';
import { AttachmentRecord, AttachmentState } from '../../src/Schema';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import { StorageAdapter } from '../../src/StorageAdapter';

const record = {
  id: 'test-1',
  filename: 'test.jpg',
  state: AttachmentState.QUEUED_DOWNLOAD
 }

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => {}),
  resolveTables: vi.fn(() => ['table1', 'table2']),
  onChangeWithCallback: vi.fn(),
  getAll: vi.fn(() => Promise.resolve([{id: 'test-1'}, {id: 'test-2'}])),
  execute: vi.fn(() => Promise.resolve()),
  getOptional: vi.fn((_query, params) => Promise.resolve(record)),
  watch: vi.fn((query, params, callbacks) => {
    callbacks?.onResult?.({ rows: { _array: [{id: 'test-1'}, {id: 'test-2'}] } });
  }),
  writeTransaction: vi.fn(async (callback) => {
    await callback({
      execute: vi.fn(() => Promise.resolve())
    });
  })
};

const mockStorage: StorageAdapter = {
  downloadFile: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  fileExists: vi.fn(),
  makeDir: vi.fn(),
  copyFile: vi.fn(),
  getUserStorageDirectory: vi.fn()
};

class TestAttachmentQueue extends AbstractAttachmentQueue {
  onAttachmentIdsChange(onUpdate: (ids: string[]) => void): void {
    throw new Error('Method not implemented.');
  }
  newAttachmentRecord(record?: Partial<AttachmentRecord>): Promise<AttachmentRecord> {
    throw new Error('Method not implemented.');
  }
}

describe('attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not download attachments when downloadRecord is called with downloadAttachments false', async () => {
    const queue = new TestAttachmentQueue({
        powersync: mockPowerSync as any,
        storage: mockStorage,
        downloadAttachments: false
    });

    await queue.downloadRecord(record);

    expect(mockStorage.downloadFile).not.toHaveBeenCalled();
  });

  it('should download attachments when downloadRecord is called with downloadAttachments true', async () => {
    const queue = new TestAttachmentQueue({
        powersync: mockPowerSync as any,
        storage: mockStorage,
        downloadAttachments: true
    });

    await queue.downloadRecord(record);

    expect(mockStorage.downloadFile).toHaveBeenCalled();
  });

  // Testing the inverse of this test, i.e. when downloadAttachments is false, is not required as you can't wait for something that does not happen
  it('should not download attachments with watchDownloads is called with downloadAttachments false', async () => {
    const queue = new TestAttachmentQueue({
        powersync: mockPowerSync as any,
        storage: mockStorage,
        downloadAttachments: true
    });

    queue.watchDownloads();
    await vi.waitFor(() => {
      expect(mockStorage.downloadFile).toBeCalledTimes(2);
    });
  });
});
