/**
 * @alpha
 */
export type AttachmentData = ArrayBuffer | string;

/**
 * @alpha
 */
export enum EncodingType {
  UTF8 = 'utf8',
  Base64 = 'base64'
}

/**
 * LocalStorageAdapter defines the interface for local file storage operations.
 * Implementations handle file I/O, directory management, and storage initialization.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export interface LocalStorageAdapter {
  /**
   * Saves data to a local file.
   * @param filePath - Path where the file will be stored
   * @param data - Data to store (ArrayBuffer, Blob, or string)
   * @returns Number of bytes written
   */
  saveFile(filePath: string, data: AttachmentData): Promise<number>;

  /**
   * Retrieves file data as an ArrayBuffer.
   * @param filePath - Path where the file is stored
   * @returns ArrayBuffer containing the file data
   */
  readFile(filePath: string): Promise<ArrayBuffer>;

  /**
   * Deletes the file at the given path.
   * @param filePath - Path where the file is stored
   */
  deleteFile(filePath: string): Promise<void>;

  /**
   * Checks if a file exists at the given path.
   * @param filePath - Path where the file is stored
   * @returns True if the file exists, false otherwise
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Creates a directory at the specified path.
   * @param path - The full path to the directory
   */
  makeDir(path: string): Promise<void>;

  /**
   * Removes a directory at the specified path.
   * @param path - The full path to the directory
   */
  rmDir(path: string): Promise<void>;

  /**
   * Initializes the storage adapter (e.g., creating necessary directories).
   */
  initialize(): Promise<void>;

  /**
   * Clears all files in the storage.
   */
  clear(): Promise<void>;

  /**
   * Returns the file path for the provided filename in the storage directory.
   * @param filename - The filename to get the path for
   * @returns The full file path
   */
  getLocalUri(filename: string): string;
}

/**
 * A {@link LocalStorageAdapter} that can relocate a file into managed storage without
 * loading it into memory. Required for {@link AttachmentQueue.saveFileFromUri}; only
 * queues configured with a streaming-capable local adapter expose that method.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export interface StreamingLocalStorageAdapter extends LocalStorageAdapter {
  /**
   * Moves a file into managed storage without loading it into memory.
   * Overwrites any existing file at the target. When source and target are the same
   * path, this is a no-op that just reports the size.
   * @param sourceUri - Path of the existing file
   * @param targetUri - Destination path within managed storage
   * @returns Number of bytes in the moved file
   */
  moveFile(sourceUri: string, targetUri: string): Promise<number>;
}
