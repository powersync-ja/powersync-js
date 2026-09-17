import { WASQLiteVFS, type PowerSyncDatabase } from '@powersync/web';

export interface DeleteDatabaseOptions {
  /** The `dbFilename` the database was opened with. */
  dbFilename: string;
  /** The VFS it was opened with, which decides where its files are. */
  vfs: WASQLiteVFS;
}

/**
 * The files wa-sqlite keeps beside a database for the file-per-database VFSs. Deleting a name that
 * was never created is fine, so these are removed unconditionally.
 */
const DB_RELATED_FILE_SUFFIXES = ['', '-journal', '-wal'];

/**
 * Deletes a database's files directly, without opening it.
 *
 * `disconnectAndClear()` deletes row by row inside SQLite, which on a database of a gigabyte or more
 * takes long enough to look like a hang. Removing the storage the VFS wrote is quick whatever the
 * size, and leaves nothing behind for the next open to find.
 *
 * The database must be closed first: a VFS that holds OPFS access handles keeps its files locked
 * while it is open, and IndexedDB defers the deletion until the last connection closes.
 *
 * Where each VFS keeps a database named `n`:
 *
 * | VFS                   | Storage                                                     |
 * | --------------------- | ----------------------------------------------------------- |
 * | `IDBBatchAtomicVFS`   | An IndexedDB database named `n`.                            |
 * | `OPFSCoopSyncVFS`     | OPFS files `n`, `n-journal` and `n-wal`.                    |
 * | `OPFSWriteAheadVFS`   | OPFS files `n`, `n-journal` and `n-wal`.                    |
 * | `AccessHandlePoolVFS` | An OPFS directory named `n` holding a pool of files.        |
 * | `InMemoryVfs`         | Nothing on disk.                                            |
 *
 * A `dbFilename` with `/` in it is a path below the OPFS root; the same path is followed here.
 */
export async function deleteDatabaseFiles({ dbFilename, vfs }: DeleteDatabaseOptions): Promise<void> {
  switch (vfs) {
    case WASQLiteVFS.IDBBatchAtomicVFS:
      await deleteIndexedDb(dbFilename);
      return;
    case WASQLiteVFS.OPFSCoopSyncVFS:
    case WASQLiteVFS.OPFSWriteAheadVFS: {
      const { directory, name } = await resolveOpfsParent(dbFilename);
      if (directory) {
        for (const suffix of DB_RELATED_FILE_SUFFIXES) {
          await removeOpfsEntry(directory, name + suffix, false);
        }
      }
      return;
    }
    case WASQLiteVFS.AccessHandlePoolVFS: {
      const { directory, name } = await resolveOpfsParent(dbFilename);
      if (directory) {
        await removeOpfsEntry(directory, name, true);
      }
      return;
    }
    case WASQLiteVFS.InMemoryVfs:
      return;
  }
}

/**
 * Disconnects and closes a live database, then deletes its files.
 *
 * The order matters. A client that is still connected when its files go simply downloads everything
 * again, and a VFS holding OPFS access handles keeps the files locked until the database is closed.
 * Use this rather than {@link deleteDatabaseFiles} whenever the database is still open.
 */
export async function closeAndDeleteDatabase(
  database: PowerSyncDatabase,
  options: DeleteDatabaseOptions
): Promise<void> {
  await database.disconnect();
  await database.close();
  await deleteDatabaseFiles(options);
}

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Could not delete IndexedDB database ${name}`));
    // Another connection is still open. The deletion goes ahead once it closes, so keep waiting.
    request.onblocked = () => {};
  });
}

/** The OPFS directory a path's last segment lives in, or null when a parent directory does not exist. */
async function resolveOpfsParent(path: string): Promise<{ directory: FileSystemDirectoryHandle | null; name: string }> {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  const name = segments.pop() ?? path;
  let directory: FileSystemDirectoryHandle | null = await navigator.storage.getDirectory();
  for (const segment of segments) {
    try {
      directory = await directory.getDirectoryHandle(segment);
    } catch (error: unknown) {
      if (isNotFound(error)) {
        return { directory: null, name };
      }
      throw error;
    }
  }
  return { directory, name };
}

async function removeOpfsEntry(directory: FileSystemDirectoryHandle, name: string, recursive: boolean): Promise<void> {
  try {
    await directory.removeEntry(name, { recursive });
  } catch (error: unknown) {
    if (!isNotFound(error)) {
      throw error;
    }
  }
}

const isNotFound = (error: unknown): boolean => error instanceof DOMException && error.name === 'NotFoundError';
