import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentQueue } from '../../src/AttachmentQueue.js';
import { AttachmentState } from '../../src/Schema.js';
import { LocalStorageAdapter } from '../../src/LocalStorageAdapter.js';
import { RemoteStorageAdapter } from '../../src/RemoteStorageAdapter.js';

const record = {
  id: 'test-1',
  filename: 'test.jpg',
  state: AttachmentState.QUEUED_DOWNLOAD
};

const mockPowerSync = {
  currentStatus: { status: 'initial' },
  registerListener: vi.fn(() => {}),
  resolveTables: vi.fn(() => ['table1', 'table2']),
  onChangeWithCallback: vi.fn(),
  getAll: vi.fn(() => Promise.resolve([{ id: 'test-1' }, { id: 'test-2' }])),
  execute: vi.fn(() => Promise.resolve()),
  getOptional: vi.fn((_query, params) => Promise.resolve(record)),
  watch: vi.fn((query, params, callbacks) => {
    callbacks?.onResult?.({
      rows: {
        _array: [
          { id: 'test-1', fileExtension: 'jpg' },
          { id: 'test-2', fileExtension: 'jpg' }
        ]
      }
    });
  }),
  writeTransaction: vi.fn(async (callback) => {
    await callback({
      execute: vi.fn(() => Promise.resolve())
    });
  })
};

const mockLocalStorage: LocalStorageAdapter = {
  deleteFile: vi.fn(),
  saveFile: vi.fn(),
  readFile: vi.fn(),
  fileExists: vi.fn(),
  getUserStorageDirectory: vi.fn(),
  initialize: vi.fn(),
  clear: vi.fn()
};

const mockRemoteStorage: RemoteStorageAdapter = {
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
  deleteFile: vi.fn()
};

const watchAttachments = (onUpdate: (attachments: any[]) => void) => {
  mockPowerSync.watch('SELECT id FROM table1', [], {
    onResult: (result) => onUpdate(result.rows?._array.map((r) => ({ id: r.id, fileExtension: 'jpg' })) ?? [])
  });
};

// describe('attachments', () => {
//   beforeEach(() => {
//     vi.clearAllMocks();
//   });

//   it('should not download attachments when downloadRecord is called with downloadAttachments false', async () => {
//     const queue = new AttachmentQueue({
//       db: mockPowerSync as any,
//       watchAttachments: watchAttachments,
//       remoteStorage: mockRemoteStorage,
//       localStorage: mockLocalStorage
//     });

//     await queue.saveFile;

//     expect(mockLocalStorage.downloadFile).not.toHaveBeenCalled();
//   });

//   it('should download attachments when downloadRecord is called with downloadAttachments true', async () => {
//     const queue = new TestAttachmentQueue({
//       powersync: mockPowerSync as any,
//       storage: mockLocalStorage,
//       downloadAttachments: true
//     });

//     await queue.downloadRecord(record);

//     expect(mockLocalStorage.downloadFile).toHaveBeenCalled();
//   });

//   // Testing the inverse of this test, i.e. when downloadAttachments is false, is not required as you can't wait for something that does not happen
//   it('should not download attachments with watchDownloads is called with downloadAttachments false', async () => {
//     const queue = new TestAttachmentQueue({
//       powersync: mockPowerSync as any,
//       storage: mockLocalStorage,
//       downloadAttachments: true
//     });

//     queue.watchDownloads();
//     await vi.waitFor(() => {
//       expect(mockLocalStorage.downloadFile).toBeCalledTimes(2);
//     });
//   });
// });
