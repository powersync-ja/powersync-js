import path from 'node:path';
import { describe, expect, vi } from 'vitest';
import {
  AbstractPowerSyncDatabase,
  AttachmentQueue,
  AttachmentRecord,
  AttachmentState,
  AttachmentTable,
  NodeFileSystemAdapter,
  RemoteStorageAdapter,
  Schema,
  Table,
  column
} from '../lib/index.js';
import { customDatabaseTest } from './utils.js';

const schema = new Schema({
  users: new Table({
    name: column.text,
    photo_id: column.text
  }),
  attachments: new AttachmentTable()
});

const attachmentTest = customDatabaseTest({ schema });

const remoteStorage: RemoteStorageAdapter = {
  uploadFile: async () => {},
  downloadFile: async () => new ArrayBuffer(0),
  deleteFile: async () => {}
};

function createQueue(db: AbstractPowerSyncDatabase, tmpdir: string, archivedCacheLimit: number) {
  return new AttachmentQueue({
    db,
    localStorage: new NodeFileSystemAdapter(path.join(tmpdir, 'attachments')),
    remoteStorage,
    watchAttachments: () => {},
    archivedCacheLimit
  });
}

function archivedRecord(id: string): AttachmentRecord {
  return {
    id,
    filename: `${id}.jpg`,
    timestamp: 1,
    hasSynced: true,
    state: AttachmentState.ARCHIVED
  };
}

async function countAttachments(db: AbstractPowerSyncDatabase): Promise<number> {
  const row = await db.get<{ count: number }>('SELECT count(*) AS count FROM attachments');
  return row.count;
}

/**
 * Resolves to a description of how the call ended instead of hanging, so a loop that
 * never terminates fails with a readable message rather than a bare test timeout.
 */
function outcomeOf(call: Promise<void>, timeoutMs: number): Promise<string> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(`still running after ${timeoutMs}ms`), timeoutMs);
    call.then(
      () => {
        clearTimeout(timer);
        resolve('returned');
      },
      (error) => {
        clearTimeout(timer);
        resolve(`threw ${error}`);
      }
    );
  });
}

describe('AttachmentContext.deleteArchivedAttachments', () => {
  attachmentTest('reports completion when there is nothing to delete', async ({ database, tmpdir }) => {
    const queue = createQueue(database, tmpdir, 100);
    const onDeleted = vi.fn(async () => {});

    const isDone = await queue.withAttachmentContext((ctx) => ctx.deleteArchivedAttachments(onDeleted));

    expect(isDone).toBe(true);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  attachmentTest('reports completion after deleting a partial page', async ({ database, tmpdir }) => {
    const queue = createQueue(database, tmpdir, 0);
    const onDeleted = vi.fn(async () => {});

    const isDone = await queue.withAttachmentContext(async (ctx) => {
      await ctx.saveAttachments([archivedRecord('a'), archivedRecord('b')]);
      return await ctx.deleteArchivedAttachments(onDeleted);
    });

    expect(isDone).toBe(true);
    expect(onDeleted).toHaveBeenCalledOnce();
    expect(await countAttachments(database)).toBe(0);
  });
});

describe('AttachmentQueue.expireCache', () => {
  attachmentTest('stops once there is nothing archived left to delete', async ({ database, tmpdir }) => {
    const queue = createQueue(database, tmpdir, 100);

    expect(await outcomeOf(queue.expireCache(), 2000)).toBe('returned');
  });

  attachmentTest('deletes archived attachments over the cache limit and then stops', async ({ database, tmpdir }) => {
    const queue = createQueue(database, tmpdir, 0);
    await queue.withAttachmentContext((ctx) => ctx.saveAttachments([archivedRecord('a'), archivedRecord('b')]));

    expect(await outcomeOf(queue.expireCache(), 2000)).toBe('returned');
    expect(await countAttachments(database)).toBe(0);
  });
});
