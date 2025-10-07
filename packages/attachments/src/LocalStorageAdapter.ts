export enum EncodingType {
  UTF8 = 'utf8',
  Base64 = 'base64'
}

export interface LocalStorageAdapter {
  /**
   * Saves buffer data to a local file.
   * @param filePath Path where the file will be stored
   * @param data Data string to store
   * @returns Number of bytes written
   */
  saveFile(filePath: string, data: ArrayBuffer | Blob | string): Promise<number>;

  /**
   * Retrieves an ArrayBuffer with the file data from the given path.
   * @param filePath Path where the file is stored
   * @returns ArrayBuffer with the file data
   */
  readFile(filePath: string): Promise<ArrayBuffer>;

  /**
   * Deletes the file at the given path.
   * @param filePath Path where the file is stored
   */
  deleteFile(filePath: string): Promise<void>;

  /**
   * Checks if a file exists at the given path.
   * @param filePath Path where the file is stored
   * @returns True if the file exists, false otherwise
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Creates a directory at the specified path.
   * @param path The full path to the directory
   * @throws PowerSyncAttachmentError if creation fails
   */
  makeDir(path: string): Promise<void>;

  /**
   * Removes a directory at the specified path.
   * @param path The full path to the directory
   * @throws PowerSyncAttachmentError if removal fails
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
   * Returns the file path of the provided filename in the user storage directory.
   * @param filename The filename to get the path for
   * @returns The full file path
   */
  getLocalUri(filename: string): string;
}
