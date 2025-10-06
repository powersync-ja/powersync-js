export enum EncodingType {
  UTF8 = 'utf8',
  Base64 = 'base64'
}

export interface LocalStorageAdapter {
  /**
   * Saves buffer data to a local file.
   * @param filePath Path where the file will be stored
   * @param data Data string to store
   * @returns number of bytes written
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
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Initializes the storage adapter (e.g., creating necessary directories).
   */
  initialize(): Promise<void>;

  /**
   * Clears all files in the storage.
   */
  clear(): Promise<void>;

  /**
   * Get the base directory used by the storage adapter.
   * @returns The base directory path as a string.
   */
  getUserStorageDirectory(): string;
}