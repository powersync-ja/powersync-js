// @ts-expect-error
import { FacadeVFS } from '@journeyapps/wa-sqlite/src/FacadeVFS.js';
import { MemoryVFS } from '@journeyapps/wa-sqlite/src/examples/MemoryVFS.js';
import * as VFS from '@journeyapps/wa-sqlite/src/VFS.js';

type DirectoryResolver = () => Promise<{ dir: FileSystemDirectoryHandle; readWriteUnsafe: boolean }>;

export class SimpleOpfsFileSystem extends FacadeVFS {
  #files: OpfsFiles | null = null;
  #memory: any;
  #openedFiles = new Map<number, PersistedFile>();
  #openRoot: DirectoryResolver;

  constructor(name: string, module: object, openRoot: DirectoryResolver) {
    super(name, module);
    this.#memory = new MemoryVFS(`${name}-memory`, module);
    this.#openRoot = openRoot;
  }

  #requireFiles(): OpfsFiles {
    if (this.#files == null) {
      throw new Error(`Called OPFS method while closed.`);
    }

    return this.#files;
  }

  #requireFile(file: PersistedFile): FileSystemSyncAccessHandle {
    return this.#requireFiles().files[file.index];
  }

  #useFile(options: {
    fileId: number;
    opfs: (file: FileSystemSyncAccessHandle) => number;
    memory: (memory: any) => number;
  }): number {
    const opened = this.#openedFiles.get(options.fileId);
    if (opened != null) {
      try {
        return options.opfs(this.#requireFile(opened));
      } catch (e) {
        console.error('OPFS VFS error', e);
        return VFS.SQLITE_IOERR;
      }
    } else {
      return options.memory(this.#memory);
    }
  }

  jOpen(zName: string | null, fileId: number, flags: number, pOutFlags: DataView): number {
    if (flags & VFS.SQLITE_OPEN_MAIN_DB) {
      this.#openedFiles.set(fileId, database);
      return VFS.SQLITE_OK;
    } else if (flags & VFS.SQLITE_OPEN_MAIN_JOURNAL) {
      this.#openedFiles.set(fileId, databaseJournal);
      return VFS.SQLITE_OK;
    } else {
      // We don't care about other files (like those for materialized views). Back them by the in-memory VFS.
      return this.#memory.jOpen(zName, fileId, flags, pOutFlags);
    }
  }

  jDelete(name: string, syncDir: number): number {
    switch (name) {
      case '/database':
      case '/database-journal':
        // We don't support deleting files in this VFS, and use a journal mode where that is not necessary.
        return VFS.SQLITE_IOERR_DELETE;
      default:
        return this.#memory.jDelete(name, syncDir);
    }
  }

  jAccess(zName: string, flags: number, pResOut: DataView): number {
    switch (zName) {
      case '/database':
      case '/database-journal':
        // These always exist
        pResOut.setInt32(0, 1, true);
        return VFS.SQLITE_OK;
      default:
        return this.#memory.jAccess(zName, flags, pResOut);
    }
  }

  jClose(fileId: number): number {
    return this.#useFile({
      fileId,
      opfs: () => {
        this.#openedFiles.delete(fileId);
        return VFS.SQLITE_OK;
      },
      memory: (m) => m.jClose(fileId)
    });
  }

  jRead(fileId: number, data: Uint8Array, iOffset: number): number {
    return this.#useFile({
      fileId,
      opfs: (file) => {
        const bytesRead = file.read(data.subarray(), { at: iOffset });

        if (bytesRead < data.byteLength) {
          data.fill(0, bytesRead);
          return VFS.SQLITE_IOERR_SHORT_READ;
        }
        return VFS.SQLITE_OK;
      },
      memory: (m) => m.jRead(fileId, data, iOffset)
    });
  }

  jWrite(fileId: number, data: Uint8Array, iOffset: number): number {
    return this.#useFile({
      fileId,
      opfs: (file) => {
        const nBytes = file.write(data.subarray(), { at: iOffset });
        if (nBytes !== data.byteLength) throw new Error('short write');
        return VFS.SQLITE_OK;
      },
      memory: (m) => m.jWrite(fileId, data, iOffset)
    });
  }

  jTruncate(fileId: number, iSize: number): number {
    return this.#useFile({
      fileId,
      opfs: (file) => {
        file.truncate(iSize);
        return VFS.SQLITE_OK;
      },
      memory: (m) => m.jTruncate(fileId, iSize)
    });
  }

  jSync(fileId: number, flags: number): number {
    return this.#useFile({
      fileId,
      opfs: (file) => {
        file.flush();
        return VFS.SQLITE_OK;
      },
      memory: (m) => m.jSync(fileId, flags)
    });
  }

  jFileSize(fileId: number, pSize64: DataView): number {
    return this.#useFile({
      fileId,
      opfs: (file) => {
        pSize64.setBigInt64(0, BigInt(file.getSize()), true);
        return VFS.SQLITE_OK;
      },
      memory: (m) => m.jFileSize(fileId, pSize64)
    });
  }

  /**
   * Re-opens a file system previously closed with {@link SimpleOpfsFileSystem.close}.
   */
  async open() {
    console.assert(this.#files == null);
    const { dir, readWriteUnsafe } = await this.#openRoot();
    this.#files = await OpfsFiles.open(dir, readWriteUnsafe);
  }

  /**
   * Closes the synchronous access handles kept open while this file system is active.
   *
   * This file system can be re-opened afterwards with {@link SimpleOpfsFileSystem.open}.
   */
  close() {
    this.#files?.close();
    this.#files = null;
  }

  static directoryResolver(
    name: string,
    readWriteUnsafe: boolean,
    getRoot?: () => Promise<FileSystemDirectoryHandle>
  ): DirectoryResolver {
    const url = new URL(`file:/${name}`);

    return async () => {
      let dir = await (getRoot ? getRoot() : navigator.storage.getDirectory());

      for (const segment of ['powersync', ...url.pathname.split('/')]) {
        if (!segment.length) continue; // Skip initial / and empty directory names

        dir = await dir.getDirectoryHandle(segment, { create: true });
      }

      return { dir, readWriteUnsafe };
    };
  }
}

class OpfsFiles {
  readonly files: ReadonlyArray<FileSystemSyncAccessHandle>;

  constructor(database: FileSystemSyncAccessHandle, journal: FileSystemSyncAccessHandle) {
    this.files = [database, journal];
  }

  close() {
    for (const file of this.files) {
      file.close();
    }
  }

  static async open(root: FileSystemDirectoryHandle, readWriteUnsafe: boolean): Promise<OpfsFiles> {
    async function open(name: string) {
      const handle = await root.getFileHandle(name, { create: true });
      return await (readWriteUnsafe
        ? // @ts-expect-error
          handle.createSyncAccessHandle({ mode: 'readwrite-unsafe' })
        : handle.createSyncAccessHandle());
    }

    const [database, journal] = await Promise.allSettled([open('database'), open('journal')]);
    if (database.status === 'fulfilled' && journal.status === 'fulfilled') {
      return new OpfsFiles(database.value, journal.value);
    }

    if (database.status === 'fulfilled') {
      database.value.close();
      throw (journal as PromiseRejectedResult).reason;
    } else if (journal.status === 'fulfilled') {
      journal.value.close();
    }
    throw database.reason;
  }
}

interface PersistedFile {
  index: number;
  name: string;
}

const database: PersistedFile = Object.freeze({ index: 0, name: '/database' });
const databaseJournal: PersistedFile = Object.freeze({ index: 1, name: '/database-journal' });
