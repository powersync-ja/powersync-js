export enum EncodingType {
  UTF8 = 'utf8',
  Base64 = 'base64'
}

export interface StorageAdapter {
  uploadFile(filePath: string, data: ArrayBuffer, options?: { mediaType?: string }): Promise<void>;

  downloadFile(filePath: string): Promise<Blob>;

  writeFile(fileUri: string, base64Data: string, options?: { encoding?: EncodingType }): Promise<void>;

  readFile(fileUri: string, options?: { encoding?: EncodingType; mediaType?: string }): Promise<ArrayBuffer>;

  deleteFile(uri: string, options?: { filename?: string }): Promise<void>;

  fileExists(fileUri: string): Promise<boolean>;

  makeDir(uri: string): Promise<void>;

  copyFile(sourceUri: string, targetUri: string): Promise<void>;

  /**
   * Returns the directory where user data is stored.
   * Should end with a '/'
   */
  getUserStorageDirectory(): string;
}
