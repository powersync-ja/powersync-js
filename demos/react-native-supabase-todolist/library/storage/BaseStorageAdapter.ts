import { StorageAdapter } from '@powersync/attachments';
import * as FileSystem from 'expo-file-system';
import { decode as decodeBase64 } from 'base64-arraybuffer';

export abstract class BaseStorageAdapter implements StorageAdapter {
  async readFile(
    fileURI: string,
    options?: { encoding?: FileSystem.EncodingType; mediaType?: string }
  ): Promise<ArrayBuffer> {
    const { encoding = FileSystem.EncodingType.UTF8 } = options ?? {};
    const { exists } = await FileSystem.getInfoAsync(fileURI);
    if (!exists) {
      throw new Error(`File does not exist: ${fileURI}`);
    }
    const fileContent = await FileSystem.readAsStringAsync(fileURI, options);
    if (encoding === FileSystem.EncodingType.Base64) {
      return this.base64ToArrayBuffer(fileContent);
    }
    return this.stringToArrayBuffer(fileContent);
  }

  async writeFile(
    fileURI: string,
    base64Data: string,
    options?: {
      encoding?: FileSystem.EncodingType;
    }
  ): Promise<void> {
    const { encoding = FileSystem.EncodingType.UTF8 } = options ?? {};
    await FileSystem.writeAsStringAsync(fileURI, base64Data, { encoding });
  }

  async fileExists(fileURI: string): Promise<boolean> {
    const { exists } = await FileSystem.getInfoAsync(fileURI);
    return exists;
  }

  async makeDir(uri: string): Promise<void> {
    const { exists } = await FileSystem.getInfoAsync(uri);
    if (!exists) {
      await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
    }
  }

  async copyFile(sourceUri: string, targetUri: string): Promise<void> {
    await FileSystem.copyAsync({ from: sourceUri, to: targetUri });
  }

  getUserStorageDirectory(): string {
    return FileSystem.documentDirectory!;
  }

  async stringToArrayBuffer(str: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  /**
   * Converts a base64 string to an ArrayBuffer
   */
  async base64ToArrayBuffer(base64: string): Promise<ArrayBuffer> {
    return decodeBase64(base64);
  }

  abstract uploadFile(filePath: string, data: ArrayBuffer, options?: { mediaType?: string }): Promise<void>;
  abstract downloadFile(filePath: string): Promise<Blob>;
  abstract deleteFile(uri: string, options?: { filename?: string }): Promise<void>;
}
