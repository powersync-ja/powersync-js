import { describe, expect, it, vi } from 'vitest';
import { PowerSyncDatabase, Schema, Table, column } from '@powersync/web';
import { AbstractPowerSyncDatabase } from '@powersync/common';
import { AttachmentQueue } from '../src/AttachmentQueue.js';
import { AttachmentState, AttachmentTable } from '../src/Schema.js';
import { RemoteStorageAdapter } from '../src/RemoteStorageAdapter.js';
import { WatchedAttachmentItem } from '../src/WatchedAttachmentItem.js';
import { IndexDBFileSystemStorageAdapter } from '../src/storageAdapters/IndexDBFileSystemAdapter.js';

const mockRemoteStorage: RemoteStorageAdapter = {
  downloadFile: (attachment) => {
    return Promise.resolve(new Blob(['data:image/jpeg;base64,FAKE_BASE64_DATA'], { type: 'image/jpeg' }));
  },
  uploadFile: vi.fn(),
  deleteFile: vi.fn()
};

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
      dbFilename: 'example.db'
    }
  });

  await db.disconnectAndClear();
});

afterAll(async () => {
  await db.disconnectAndClear();
});

describe('attachment queue', () => {
  it('should download attachments when a new record with an attachment is added', async () => {
    const queue = new AttachmentQueue({
      db: db,
      watchAttachments,
      remoteStorage: mockRemoteStorage,
      localStorage: new IndexDBFileSystemStorageAdapter(),
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

    const attachmentRecords = await waitForMatch(
      () =>
        db.watch(
          /* sql */
          `
            SELECT
              *
            FROM
              attachments
          `,
          []
        ),
      (results) => {
        return results?.rows?._array.some((r: any) => r.state === AttachmentState.SYNCED);
      },
      5
    );

    const attachmentRecord = attachmentRecords.rows._array.at(0);

    const localData = await queue.localStorage.readFile(attachmentRecord.local_uri!);
    const localDataString = new TextDecoder().decode(localData);
    expect(localDataString).toBe('data:image/jpeg;base64,FAKE_BASE64_DATA');

    await queue.stopSync();
  });
});

async function waitForMatch(
  iteratorGenerator: () => AsyncIterable<any>,
  predicate: (value: any) => boolean,
  timeout: number
) {
  const timeoutMs = timeout * 1000;
  const abortController = new AbortController();

  const matchPromise = (async () => {
    const asyncIterable = iteratorGenerator();
    try {
      for await (const value of asyncIterable) {
        if (abortController.signal.aborted) {
          throw new Error('Timeout');
        }
        if (predicate(value)) {
          return value;
        }
      }
      throw new Error('Stream ended without match');
    } finally {
      const iterator = asyncIterable[Symbol.asyncIterator]();
      if (iterator.return) {
        await iterator.return();
      }
    }
  })();

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => {
      abortController.abort();
      reject(new Error('Timeout'));
    }, timeoutMs)
  );

  return Promise.race([matchPromise, timeoutPromise]);
}

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
