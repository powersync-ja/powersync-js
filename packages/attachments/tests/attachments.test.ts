import { describe, expect, it, vi } from 'vitest';
import { vol } from 'memfs'
import { PowerSyncDatabase, Schema, Table, column } from '@powersync/node';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import { AttachmentQueue } from '../src/AttachmentQueue.js';
import { attachmentFromSql, AttachmentRecord, AttachmentState, AttachmentTable } from '../src/Schema.js';
import { RemoteStorageAdapter } from '../src/RemoteStorageAdapter.js';
import { WatchedAttachmentItem } from '../src/WatchedAttachmentItem.js';
import { NodeFileSystemAdapter } from '../src/storageAdapters/NodeFileSystemAdapter.js';

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

beforeAll(async () => {
  db = new PowerSyncDatabase({
    schema: new Schema({
      users: new Table({
        name: column.text,
        email: column.text,
        photo_id: column.text
      }),
      attachments: new AttachmentTable()
    }),
    database: {
      dbFilename: 'testing.db',
      dbLocation: './tests/temp'
    }
  });

});

beforeEach(() => {
  // reset the state of in-memory fs
  vol.reset()
  // Reset mock call history
  mockUploadFile.mockClear();
  mockDownloadFile.mockClear();
  mockDeleteFile.mockClear();
})

afterEach(async () => {
  await db.disconnectAndClear();
});

const watchAttachments = (onUpdate: (attachments: WatchedAttachmentItem[]) => void) => {
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
      onResult: (result: any) =>
        onUpdate(
          result.rows?._array.map((r: any) => ({
            id: r.photo_id,
            fileExtension: 'jpg'
          })) ?? []
        )
    }
  );
};

// Helper to watch the attachments table
async function* watchAttachmentsTable(): AsyncGenerator<AttachmentRecord[]> {
  console.debug('[TEST] watchAttachmentsTable: watching attachments table');
  const watcher = db.watch(
    `
        SELECT
        *
      FROM
        attachments;
    `,
    // [AttachmentState.QUEUED_UPLOAD, AttachmentState.QUEUED_DOWNLOAD, AttachmentState.QUEUED_DELETE],
  );

  for await (const result of watcher) {
    console.debug('[TEST] watchAttachmentsTable: result', result);
    const attachments = result.rows?._array.map((r: any) => attachmentFromSql(r)) ?? [];
    console.debug('[TEST] watchAttachmentsTable: attachments', attachments);
    console.debug('[TEST] Mapped attachments:', attachments.map(a => ({ id: a.id?.substring(0,8), state: a.state, hasSynced: a.hasSynced })));
    yield attachments;
  }
}

async function waitForMatchCondition(
  iteratorGenerator: () => AsyncGenerator<AttachmentRecord[]>,
  predicate: (attachments: AttachmentRecord[]) => boolean,
  timeoutSeconds: number = 5
): Promise<AttachmentRecord[]> {
  console.debug('[TEST] waitForMatchCondition: waiting for condition');
  const timeoutMs = timeoutSeconds * 1000;
  const abortController = new AbortController();
  const startTime = Date.now();

  const generator = iteratorGenerator();

  try {
    for await (const value of generator) {
      console.debug('[TEST] waitForMatchCondition: generator value', value);
      if (Date.now() - startTime > timeoutMs) {
        console.debug('[TEST] waitForMatchCondition: timeout');
        throw new Error(`Timeout waiting for condition after ${timeoutSeconds}s`);
      }
      
      if (predicate(value)) {
        console.debug('[TEST] waitForMatchCondition: match found!');
        return value;
      }
    }
    console.debug('[TEST] waitForMatchCondition: for await loop ended without match');
    throw new Error('Stream ended without match');
  } finally {
    console.debug('[TEST] waitForMatchCondition: finally finaling');
    await generator.return?.(undefined);
    abortController.abort();
  }
}

describe('attachment queue', () => {
  it('should download attachments when a new record with an attachment is added', {
    timeout: 10000 // 10 seconds
  }, async () => {
    const queue = new AttachmentQueue({
      db: db,
      watchAttachments,
      remoteStorage: mockRemoteStorage,
      localStorage: mockLocalStorage,
    });

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
          console.debug('[TEST] Predicate checking:', results.map(r => ({ id: r.id?.substring(0,8), state: r.state })));
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
    expect(localData).toEqual(MOCK_JPEG_U8A);

    await queue.stopSync();
  });
});

// async function waitForMatch(
//   iteratorGenerator: () => AsyncGenerator<AttachmentRecord[]>,
//   predicate: (attachments: AttachmentRecord[]) => boolean,
//   timeoutSeconds: number = 5
// ): Promise<AttachmentRecord[]> {
//   const timeoutMs = timeoutSeconds * 1000;
//   const abortController = new AbortController();

//   const matchPromise = (async () => {
//     const asyncIterable = iteratorGenerator();
//     try {
//       for await (const value of asyncIterable) {
//         if (abortController.signal.aborted) {
//           throw new Error('Timeout');
//         }
//         if (predicate(value)) {
//           return value;
//         }
//       }
//       throw new Error('Stream ended without match');
//     } finally {
//       const iterator = asyncIterable[Symbol.asyncIterator]();
//       if (iterator.return) {
//         await iterator.return();
//       }
//     }
//   })();

//   const timeoutPromise = new Promise((_, reject) =>
//     setTimeout(() => {
//       abortController.abort();
//       reject(new Error('Timeout'));
//     }, timeoutMs)
//   );

//   return Promise.race([matchPromise, timeoutPromise]);
// }