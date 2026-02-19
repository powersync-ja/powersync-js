import * as SQLite from '@journeyapps/wa-sqlite';

export interface QueryExecutor {
  getAll(sql: string, params?: any[]): Promise<Record<string, any>[]>;
}

export interface InspectorFileInfo {
  name: string;
  size: number;
  lastModified: Date;
}

export interface InspectorDatabase extends QueryExecutor {
  fileInfo: InspectorFileInfo;
  close(): Promise<void>;
}

const SQLITE_HEADER_MAGIC = 'SQLite format 3\0';

/**
 * Validates that the provided bytes start with the SQLite file header magic.
 */
export function isValidSQLiteFile(bytes: Uint8Array): boolean {
  if (bytes.length < 16) return false;
  const header = new TextDecoder().decode(bytes.slice(0, 16));
  return header === SQLITE_HEADER_MAGIC;
}

/**
 * Opens an uploaded SQLite file using wa-sqlite's MemoryVFS.
 *
 * This loads the file entirely into memory and provides a read-only query interface.
 * No PowerSync initialization is performed — the file is opened as a plain SQLite database.
 */
export async function openInspectorDatabase(file: File): Promise<InspectorDatabase> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (!isValidSQLiteFile(bytes)) {
    throw new Error('Invalid file: not a SQLite database. Expected SQLite format 3 header.');
  }

  // Load the async wa-sqlite WASM module (works on main thread without COOP/COEP headers)
  const { default: factory } = await import('@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs');
  const module = await factory();
  const sqlite3 = SQLite.Factory(module);

  // Create an async in-memory VFS and register it
  const vfsName = `inspector-vfs-${Date.now()}`;
  const { MemoryAsyncVFS } = await import('@journeyapps/wa-sqlite/src/examples/MemoryAsyncVFS.js');
  const vfs = await (MemoryAsyncVFS as any).create(vfsName, module);
  sqlite3.vfs_register(vfs, false);

  // Use a fixed internal filename to avoid issues with special characters in the
  // original file name (spaces, parentheses, etc.) causing VFS pathname mismatches.
  const internalFilename = 'inspector.db';
  const url = new URL(internalFilename, 'file://');
  const pathname = url.pathname;

  vfs.mapNameToFile.set(pathname, {
    pathname,
    flags: 0,
    size: arrayBuffer.byteLength,
    data: arrayBuffer
  });

  // Open with URI filename in immutable mode. This tells SQLite the file will never
  // change, bypassing WAL recovery and journal handling that would fail in the VFS
  // (the WAL/shm files don't exist in the in-memory VFS).
  const dbPointer = await sqlite3.open_v2(
    `file:${internalFilename}?immutable=1`,
    SQLite.SQLITE_OPEN_READONLY | SQLite.SQLITE_OPEN_URI,
    vfsName
  );

  const fileInfo: InspectorFileInfo = {
    name: file.name,
    size: file.size,
    lastModified: new Date(file.lastModified)
  };

  const getAll = async (sql: string, params?: any[]): Promise<Record<string, any>[]> => {
    const results: Record<string, any>[] = [];

    for await (const stmt of sqlite3.statements(dbPointer, sql)) {
      if (stmt === null) break;

      if (params && params.length > 0) {
        // Convert booleans to integers for SQLite compatibility
        const converted = params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
        sqlite3.bind_collection(stmt, converted);
      }

      const columns = sqlite3.column_names(stmt);
      while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
        const row = sqlite3.row(stmt);
        const record: Record<string, any> = {};
        columns.forEach((col, i) => {
          record[col] = row[i];
        });
        results.push(record);
      }

      // Only execute the first statement when bindings are provided
      if (params && params.length > 0) break;
    }

    return results;
  };

  const close = async (): Promise<void> => {
    await sqlite3.close(dbPointer);
    vfs.close();
  };

  return { fileInfo, getAll, close };
}
