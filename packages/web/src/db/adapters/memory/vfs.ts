// @ts-ignore
import { FacadeVFS } from '@journeyapps/wa-sqlite/src/FacadeVFS.js';
import * as VFS from '@journeyapps/wa-sqlite/src/VFS.js';
import { emptyWalState, WalIndexChange, WalOverlayEntry, WriteAheadBuffers, WriteAheadState } from './shared.js';

const mainDbSentinel = Symbol();

export class InMemoryWriteAheadLog extends FacadeVFS {
  // The main /database file is the only file for which we create a write-ahead log. All other files (including the
  // journal) are local-only.
  #openedFiles = new Map<number, LocalFile | typeof mainDbSentinel>();
  #files = new Map<string, LocalFile | typeof mainDbSentinel>();

  #tx: WriteAheadTransaction | undefined = undefined;
  #newOverlayPagesToSendToMainTab = new Map<number, WalOverlayEntry>();

  writeAheadState: WriteAheadState = emptyWalState();

  constructor(
    module: any,
    readonly buffers: WriteAheadBuffers
  ) {
    super('InMemoryWriteAheadLog', module);
    this.#files.set('/database', mainDbSentinel);
  }

  takeChanges(): WalIndexChange {
    const added: (number | WalOverlayEntry)[] = [];
    this.#newOverlayPagesToSendToMainTab.forEach((v, k) => {
      added.push(k);
      added.push(v);
    });
    this.#newOverlayPagesToSendToMainTab.clear();

    return {
      cleared: false,
      walEnd: this.writeAheadState.walEnd,
      fileSize: this.writeAheadState.fileSize,
      added
    };
  }

  jAccess(zName: string, _pFlags: number, pResOut: DataView) {
    const file = this.#files.get(zName);
    pResOut.setInt32(0, file != null ? 1 : 0, true);
    return VFS.SQLITE_OK;
  }

  jOpen(zName: string | null, fileId: number, flags: number, pOutFlags: DataView): number {
    if (flags & VFS.SQLITE_OPEN_MAIN_DB) {
      this.#openedFiles.set(fileId, mainDbSentinel);
    } else {
      // Treat all other files, including the mostly unused journal as temporary.
      zName ??= `tmp-${crypto.randomUUID()}`;

      const existing = this.#files.get(zName);
      if (existing != null) {
        this.#openedFiles.set(fileId, existing);
      } else {
        if (!(flags & VFS.SQLITE_OPEN_CREATE)) {
          return VFS.SQLITE_IOERR;
        }

        const newFile = new LocalFile(zName, false);
        newFile.deleteOnClose = (flags & VFS.SQLITE_OPEN_DELETEONCLOSE) != 0;
        this.#openedFiles.set(fileId, newFile);
        this.#files.set(zName, newFile);
      }
    }

    pOutFlags.setInt32(0, flags, true);
    return VFS.SQLITE_OK;
  }

  jClose(fileid: number) {
    const file = this.#openedFiles.get(fileid)!;
    this.#openedFiles.delete(fileid);

    if (file != mainDbSentinel && file.deleteOnClose) {
      this.#files.delete(file.name);
    }

    return VFS.SQLITE_OK;
  }

  jRead(fileId: number, data: Uint8Array, offset: number) {
    const file = this.#openedFiles.get(fileId)!;
    let endOffset: number;
    let readableBytes: number;

    if (file == mainDbSentinel) {
      const { fileSize, overlay } = this.writeAheadState;
      const startOffset = Math.min(offset, fileSize);
      endOffset = Math.min(fileSize, offset + data.byteLength);
      readableBytes = endOffset - startOffset;

      // Try reading from the write-ahead overlay first. A read on the database file is always a complete page, except
      // when reading from the 100-byte header.
      const page = overlay.get(offset < 100 ? 0 : offset);

      if (page != null) {
        const pageOffset = page.logOffset;
        const source = new Uint8Array(
          this.buffers.writeAheadLog,
          offset < 100 ? pageOffset + offset : pageOffset,
          readableBytes
        );
        data.set(source);
      } else {
        // Page is not in WAL overlay, read directly from underlying in-memory buffer.
        data.set(new Uint8Array(this.buffers.database, startOffset, readableBytes));
      }
    } else {
      const fileSize = file.size;
      const startOffset = Math.min(offset, fileSize);
      endOffset = Math.min(fileSize, offset + data.byteLength);
      readableBytes = endOffset - startOffset;

      if (readableBytes > 0) {
        data.set(new Uint8Array(file.buffer, startOffset, readableBytes));
      }
    }

    if (readableBytes < data.byteLength) {
      data.fill(0, readableBytes); // Fill rest with zeroes.
      return VFS.SQLITE_IOERR_SHORT_READ;
    }

    return VFS.SQLITE_OK;
  }

  jWrite(fileId: number, data: Uint8Array, offset: number): number {
    const file = this.#openedFiles.get(fileId)!;
    // wa-sqlite passes a proxy instead of a real Uint8Array.
    const actualBuffer = data.subarray();

    if (file === mainDbSentinel) {
      // Write to the write-ahead overlay.
      let didWrite = false;
      if (this.#tx != null) {
        didWrite = this.#tx.appendPage(offset, actualBuffer);
      } else {
        const tx = new WriteAheadTransaction(this.writeAheadState.walEnd, this.writeAheadState.fileSize, this.buffers);
        didWrite = tx.appendPage(offset, actualBuffer);
        this.#commit(tx);
      }

      return didWrite ? VFS.SQLITE_OK : VFS.SQLITE_FULL;
    } else {
      const writeLength = data.length;
      const endOffset = offset + writeLength;
      if (endOffset > file.buffer.byteLength) {
        const didGrow = file.growBuffer(endOffset);
        if (!didGrow) {
          return VFS.SQLITE_FULL;
        }
      }

      new Uint8Array(file.buffer, offset, writeLength).set(actualBuffer);
      file.size = Math.max(file.size, endOffset);
      return VFS.SQLITE_OK;
    }
  }

  jTruncate(fileid: number, size: number): number {
    const file = this.#openedFiles.get(fileid)!;

    if (file === mainDbSentinel) {
      this.writeAheadState.fileSize = Math.min(this.writeAheadState.fileSize, size);
    } else {
      file.size = Math.min(size, file.size);
    }

    return VFS.SQLITE_OK;
  }

  jFileSize(fileid: number, pSize64: DataView) {
    const file = this.#openedFiles.get(fileid)!;

    if (file === mainDbSentinel) {
      pSize64.setBigInt64(0, BigInt(this.writeAheadState.fileSize), true);
    } else {
      pSize64.setBigInt64(0, BigInt(file.size), true);
    }

    return VFS.SQLITE_OK;
  }

  jDelete(name: string) {
    if (name === '/database') {
      return VFS.SQLITE_IOERR_DELETE;
    }

    this.#files.delete(name);
    return VFS.SQLITE_OK;
  }

  jDeviceCharacteristics(): number {
    return VFS.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN | VFS.SQLITE_IOCAP_BATCH_ATOMIC;
  }

  jFileControl(fileid: number, op: number) {
    const file = this.#openedFiles.get(fileid)!;
    if (file !== mainDbSentinel) return VFS.SQLITE_NOTFOUND;

    switch (op) {
      case VFS.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE:
        this.#tx = new WriteAheadTransaction(this.writeAheadState.walEnd, this.writeAheadState.fileSize, this.buffers);
        break;
      case VFS.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE:
        this.#tx = undefined;
        break;
      case VFS.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE:
        this.#commit(this.#tx!);
        this.#tx = undefined;
        break;
      default:
        return VFS.SQLITE_NOTFOUND;
    }

    return VFS.SQLITE_OK;
  }

  #commit(tx: WriteAheadTransaction) {
    this.writeAheadState.walEnd = tx.walEndOffset;
    this.writeAheadState.fileSize = tx.fileSize;
    tx.changedPages.forEach((walEntry, databaseOffset) => {
      this.#newOverlayPagesToSendToMainTab.set(databaseOffset, walEntry);
      this.writeAheadState.overlay.set(databaseOffset, walEntry);
    });
  }
}

class WriteAheadTransaction {
  walEndOffset: number;
  fileSize: number;
  changedPages = new Map<number, WalOverlayEntry>();

  constructor(
    endOffset: number,
    fileSize: number,
    readonly buffers: WriteAheadBuffers
  ) {
    this.walEndOffset = endOffset;
    this.fileSize = fileSize;
  }

  appendPage(offset: number, data: Uint8Array): boolean {
    const currentEnd = this.walEndOffset;
    const newEnd = currentEnd + data.length;

    const wal = this.buffers.writeAheadLog;
    if (newEnd >= wal.byteLength) {
      if (!this.#growWal(wal, newEnd)) return false;
    }
    this.fileSize = Math.max(this.fileSize, offset + data.length);
    new Uint8Array(wal, currentEnd, data.length).set(data);

    this.walEndOffset = newEnd;
    this.changedPages.set(offset, { logOffset: currentEnd, size: data.length });
    return true;
  }

  #growWal(buffer: SharedArrayBuffer, minSize: number) {
    const newSize = Math.max(minSize, 2 * buffer.byteLength);
    if (newSize > buffer.maxByteLength) {
      return false;
    }

    buffer.grow(newSize);
    return true;
  }
}

class LocalFile {
  deleteOnClose = false;
  name: string;
  buffer = new ArrayBuffer(1024);
  size: number = 0;

  constructor(
    name: string,
    readonly isMainDatabase: boolean
  ) {
    this.name = name;
  }

  growBuffer(minSize: number): boolean {
    const newSize = Math.max(minSize, 2 * this.buffer.byteLength);
    const newBuffer = new ArrayBuffer(newSize);

    new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
    this.buffer = newBuffer;
    return true;
  }
}
