import { describe, expect, it, vi } from 'vitest';
import { vol } from 'memfs'
import { PowerSyncDatabase, Schema, Table, column } from '@powersync/node';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import { AttachmentQueue } from '../src/AttachmentQueue.js';
import { attachmentFromSql, AttachmentRecord, AttachmentState, AttachmentTable } from '../src/Schema.js';
import { RemoteStorageAdapter } from '../src/RemoteStorageAdapter.js';
import { WatchedAttachmentItem } from '../src/WatchedAttachmentItem.js';
import { NodeFileSystemAdapter } from '../src/storageAdapters/NodeFileSystemAdapter.js';
import { AttachmentErrorHandler } from '../src/AttachmentErrorHandler.js';

const MOCK_JPEG_U8A = [
  0xFF, 0xD8, 0xFF, 0xE0,
  0x00, 0x10,
  0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01,
  0x00,
  0x00, 0x01, 0x00, 0x01,
  0x00, 0x00,
  0xFF, 0xD9
];
// This creates a 1x1 pixel JPEG that's base64 encoded
const createMockJpegBuffer = (): ArrayBuffer => {
  return new Uint8Array(MOCK_JPEG_U8A).buffer;
};

const mockUploadFile = vi.fn().mockResolvedValue(undefined);
const mockDownloadFile = vi.fn().mockResolvedValue(createMockJpegBuffer());
const mockDeleteFile = vi.fn().mockResolvedValue(undefined);

const mockRemoteStorage: RemoteStorageAdapter = {
  downloadFile: mockDownloadFile,
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile
};

// we mock the local file system and use the NodeFileSystemAdapter to save and read files in memory
// see more: https://vitest.dev/guide/mocking/file-system
vi.mock('fs', () => {
  const { fs } = require('memfs');
  return fs;
});

const mockLocalStorage = new NodeFileSystemAdapter('./temp/attachments');

let db: AbstractPowerSyncDatabase;
let queue: AttachmentQueue;
const schema = new Schema({
  users: new Table({
    name: column.text,
    email: column.text,
    photo_id: column.text
  }),
  attachments: new AttachmentTable()
});

const INTERVAL_MILLISECONDS = 1000;

const watchAttachments = (onUpdate: (attachments: WatchedAttachmentItem[]) => Promise<void>) => {
  db.watch(
    /* sql */
    `
      SELECT
        photo_id
      FROM
        users
      WHERE
        photo_id IS NOT NULL
    `,
    [],
    {
      onResult: async (result: any) =>
      await onUpdate(
          result.rows?._array.map((r: any) => ({
            id: r.photo_id,
            fileExtension: 'jpg'
          })) ?? []
        )
    }
  );
};

beforeEach(() => {
  db = new PowerSyncDatabase({
    schema,
    database: {
      dbFilename: 'testing.db',
    }
  });
  // reset the state of in-memory fs
  vol.reset()
  // Reset mock call history
  mockUploadFile.mockClear();
  mockDownloadFile.mockClear();
  mockDeleteFile.mockClear();
  queue = new AttachmentQueue({
    db: db,
    watchAttachments,
    remoteStorage: mockRemoteStorage,
    localStorage: mockLocalStorage,
    syncIntervalMs: INTERVAL_MILLISECONDS,
  });
})

afterEach(async () => {
  await queue.stopSync();
  await db.disconnectAndClear();
  await db.close();
});

// Helper to watch the attachments table
async function* watchAttachmentsTable(): AsyncGenerator<AttachmentRecord[]> {
  const watcher = db.watch(
    `
        SELECT
        *
      FROM
        attachments;
    `,
  );

  for await (const result of watcher) {
    const attachments = result.rows?._array.map((r: any) => attachmentFromSql(r)) ?? [];
    yield attachments;
  }
}

async function waitForMatchCondition(
  iteratorGenerator: () => AsyncGenerator<AttachmentRecord[]>,
  predicate: (attachments: AttachmentRecord[]) => boolean,
  timeoutSeconds: number = 5
): Promise<AttachmentRecord[]> {
  const timeoutMs = timeoutSeconds * 1000;
  const abortController = new AbortController();
  const startTime = Date.now();

  const generator = iteratorGenerator();

  try {
    for await (const value of generator) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Timeout waiting for condition after ${timeoutSeconds}s`);
      }
      
      if (predicate(value)) {
        return value;
      }
    }
    throw new Error('Stream ended without match');
  } finally {
    await generator.return?.(undefined);
    abortController.abort();
  }
}

describe('attachment queue', () => {
  it('should use the correct relative path for the local file', async () => {
    await queue.startSync();
    const id = await queue.generateAttachmentId();
    await db.execute(
      'INSERT INTO users (id, name, email, photo_id) VALUES (uuid(), ?, ?, ?)',
      ['steven', 'steven@journeyapps.com', id],
    );

    // wait for the file to be synced
    await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.id === id && r.state === AttachmentState.SYNCED),
      5
    );
    const expectedLocalUri = await queue.localStorage.getLocalUri(`${id}.jpg`);

    expect(await mockLocalStorage.fileExists(expectedLocalUri)).toBe(true);

    await queue.stopSync();
  })

  it('should download attachments when a new record with an attachment is added', {
    timeout: 10000 // 10 seconds
  }, async () => {
    await queue.startSync();

    
    await db.execute(
      /* sql */
      `
      INSERT INTO
      users (id, name, email, photo_id)
      VALUES
      (
        uuid (),
        'example',
        'example@example.com',
        uuid ()
        )
        `,
        []
      );
      
      const attachments = await waitForMatchCondition(
        () => watchAttachmentsTable(),
        (results) => {
          return results.some((r) => r.state === AttachmentState.SYNCED)
        },
        5
      );

    const attachmentRecord = attachments.find((r) => r.state === AttachmentState.SYNCED);
    if (!attachmentRecord) {
      throw new Error('No attachment record found');
    }

    // Verify the download was called
    expect(mockDownloadFile).toHaveBeenCalled();

    // Verify local file exists
    const localData = await queue.localStorage.readFile(attachmentRecord.localUri!);
    expect(Array.from(new Uint8Array(localData))).toEqual(MOCK_JPEG_U8A);

    await queue.stopSync();
  });

  it('should upload attachments when a new file is saved', {
    timeout: 10000
  }, async () => {
    await queue.startSync();
  
    // Create mock file data (123 bytes)
    const mockFileData = new Uint8Array(123).fill(42); // Fill with some data
  
    // Save file with updateHook to link to user
    const record = await queue.saveFile({
      data: mockFileData.buffer,
      fileExtension: 'jpg',
      mediaType: 'image/jpeg',
      updateHook: async (tx, attachment) => {
        await tx.execute(
          'INSERT INTO users (id, name, email, photo_id) VALUES (uuid(), ?, ?, ?)',
          ['testuser', 'testuser@journeyapps.com', attachment.id]
        );
      }
    });
  
    expect(record.size).toBe(123);
    expect(record.state).toBe(AttachmentState.QUEUED_UPLOAD);
  
    // Wait for attachment to be uploaded and synced
    const attachments = await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.id === record.id && r.state === AttachmentState.SYNCED),
      5
    );
  
    const attachmentRecord = attachments.find((r) => r.id === record.id);
    expect(attachmentRecord?.state).toBe(AttachmentState.SYNCED);
  
    // Verify upload was called
    expect(mockUploadFile).toHaveBeenCalled();
    const uploadCall = mockUploadFile.mock.calls[0];
    expect(uploadCall[1].id).toBe(record.id);
  
    // Verify local file exists
    expect(await mockLocalStorage.fileExists(record.localUri!)).toBe(true);
  
    // Clear the user's photo_id to archive the attachment
    await db.execute('UPDATE users SET photo_id = NULL');
  
  
    // Wait for attachment to be archived
    await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.id === record.id && r.state === AttachmentState.ARCHIVED),
      5
    )

    // Wait for attachment to be deleted (not just archived)
    await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => !results.some(r => r.id === record.id),
      5
    );

    // await queue.syncStorage(); // <-- explicitly delete
  
    // File should be deleted too
    expect(await mockLocalStorage.fileExists(record.localUri!)).toBe(false);
  
    await queue.stopSync();
  });

  it('should delete attachments', async () => {
    await queue.startSync();

    const id = await queue.generateAttachmentId();

    await db.execute(
      'INSERT INTO users (id, name, email, photo_id) VALUES (uuid(), ?, ?, ?)',
      ['steven', 'steven@journeyapps.com', id],
    );

    await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.id === id && r.state === AttachmentState.SYNCED),
      5
    );

    await queue.deleteFile({
      id,
      updateHook: async (tx, attachment) => {
        await tx.execute(
          'UPDATE users SET photo_id = NULL WHERE photo_id = ?',
          [attachment.id],
        );
      }
    });

    const toBeDeletedAttachments = await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.id === id && r.state === AttachmentState.QUEUED_DELETE),
      5
    );

    expect(toBeDeletedAttachments.length).toBe(1);
    expect(toBeDeletedAttachments[0].id).toBe(id);
    expect(toBeDeletedAttachments[0].state).toBe(AttachmentState.QUEUED_DELETE);
    expect(toBeDeletedAttachments[0].hasSynced).toBe(false);

    // wait for the file to be deleted
    await new Promise(resolve => setTimeout(resolve, 1500));

    expect(await mockLocalStorage.fileExists(toBeDeletedAttachments[0].localUri!)).toBe(false);

    await queue.stopSync();
  })

  it('should recover from deleted local file', async () => {
    // create an attachment record that has an invalid localUri
    await db.execute(
      `
      INSERT 
      OR REPLACE INTO attachments (
        id,
        timestamp,
        filename,
        local_uri,
        size,
        media_type,
        has_synced,
        state
      )
      VALUES 
        (uuid(), current_timestamp, ?, ?, ?, ?, ?, ?)`,
      [
        'test.jpg',
        'invalid/dir/test.jpg', 
        100, 
        'image/jpeg', 
        1, 
        AttachmentState.SYNCED
      ],
    );

    await queue.startSync();

    const attachmentRecord = await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.state === AttachmentState.ARCHIVED),
      5
    );

    expect(attachmentRecord[0].filename).toBe('test.jpg');
    // it seems that the localUri is not set to null
    expect(attachmentRecord[0].localUri).toBe(null);
    expect(attachmentRecord[0].state).toBe(AttachmentState.ARCHIVED);

    await queue.stopSync();
  });

  it('should cache downloaded attachments', async () => {
    await queue.startSync();

    const id = await queue.generateAttachmentId();
    await db.execute(
      'INSERT INTO users (id, name, email, photo_id) VALUES (uuid(), ?, ?, ?)',
      ['testuser', 'testuser@journeyapps.com', id],
    );

    await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.state === AttachmentState.SYNCED),
      5
    );

    expect(mockDownloadFile).toHaveBeenCalled();
    expect(mockDownloadFile).toHaveBeenCalledWith({
      filename: `${id}.jpg`,
      hasSynced: false,
      id: id,
      localUri: null,
      mediaType: null,
      metaData: null,
      size: null,
      state: AttachmentState.QUEUED_DOWNLOAD,
      timestamp: null,
    });

    // Archive attachment by not referencing it anymore.
    await db.execute('UPDATE users SET photo_id = NULL');
    await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.state === AttachmentState.ARCHIVED),
      5
    );

    // Restore from cache
    await db.execute('UPDATE users SET photo_id = ?', [id]);
    await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.state === AttachmentState.SYNCED),
      5
    );

    const localUri = await queue.localStorage.getLocalUri(`${id}.jpg`);
    expect(await mockLocalStorage.fileExists(localUri)).toBe(true);

    // Verify the download was not called again
    expect(mockDownloadFile).toHaveBeenCalledExactlyOnceWith({
      filename: `${id}.jpg`,
      hasSynced: false,
      id: id,
      localUri: null,
      mediaType: null,
      metaData: null,
      size: null,
      state: AttachmentState.QUEUED_DOWNLOAD,
      timestamp: null,
    });

    await queue.stopSync();
  })

  it('should skip failed download and retry it in the next sync', async () => {
    const mockErrorHandler = vi.fn().mockRejectedValue(false);
    const errorHandler: AttachmentErrorHandler = {
      onDeleteError: mockErrorHandler,
      onDownloadError: mockErrorHandler,
      onUploadError: mockErrorHandler,
    }
    const mockDownloadFile = vi.fn()
    .mockRejectedValueOnce(new Error('Download failed'))
    .mockResolvedValueOnce(createMockJpegBuffer());

    const mockRemoteStorage: RemoteStorageAdapter = {
      downloadFile: mockDownloadFile,
      uploadFile: mockUploadFile,
      deleteFile: mockDeleteFile
    };

    // no error handling yet expose error handling
    const localeQueue = new AttachmentQueue({
      db: db,
      watchAttachments,
      remoteStorage: mockRemoteStorage,
      localStorage: mockLocalStorage,
      syncIntervalMs: INTERVAL_MILLISECONDS,
      errorHandler,
    });

    const id = await localeQueue.generateAttachmentId();

    await localeQueue.startSync()

    await db.execute(
      'INSERT INTO users (id, name, email, photo_id) VALUES (uuid(), ?, ?, ?)',
      ['testuser', 'testuser@journeyapps.com', id],
    );

    await waitForMatchCondition(
      () => watchAttachmentsTable(),
      (results) => results.some((r) => r.id === id && r.state === AttachmentState.SYNCED),
      5
    );

    expect(mockErrorHandler).toHaveBeenCalledOnce();
    expect(mockDownloadFile).toHaveBeenCalledTimes(2);

  })
});