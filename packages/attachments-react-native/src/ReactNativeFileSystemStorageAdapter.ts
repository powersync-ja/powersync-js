import { decode as decodeBase64, encode as encodeBase64 } from 'base64-arraybuffer';
import type { AttachmentData, LocalStorageAdapter } from '@powersync/common';

/**
 * ReactNativeFileSystemStorageAdapter implements LocalStorageAdapter using @dr.pogodin/react-native-fs.
 * Suitable for React Native applications not using Expo, or those preferring react-native-fs.
 */
export class ReactNativeFileSystemStorageAdapter implements LocalStorageAdapter {
  private rnfs: typeof import('@dr.pogodin/react-native-fs');
  private storageDirectory: string;

  constructor(storageDirectory?: string) {
    let rnfs: typeof import('@dr.pogodin/react-native-fs');
    try {
      rnfs = require('@dr.pogodin/react-native-fs');
    } catch (e) {
      throw new Error(`Could not resolve @dr.pogodin/react-native-fs.
To use the React Native File System attachment adapter please install @dr.pogodin/react-native-fs.`);
    }

    this.rnfs = rnfs;
    // Default to a subdirectory in the document directory
    this.storageDirectory = storageDirectory ?? `${this.rnfs.DocumentDirectoryPath}/attachments/`;
  }

  async initialize(): Promise<void> {
    const dirExists = await this.rnfs.exists(this.storageDirectory);
    if (!dirExists) {
      await this.rnfs.mkdir(this.storageDirectory);
    }
  }

  async clear(): Promise<void> {
    const dirExists = await this.rnfs.exists(this.storageDirectory);
    if (dirExists) {
      await this.rnfs.unlink(this.storageDirectory);
      await this.rnfs.mkdir(this.storageDirectory);
    }
  }

  getLocalUri(filename: string): string {
    const separator = this.storageDirectory.endsWith('/') ? '' : '/';
    return `${this.storageDirectory}${separator}${filename}`;
  }

  async saveFile(
    filePath: string,
    data: AttachmentData
  ): Promise<number> {
    let size: number;

    if (typeof data === 'string') {
      // String data is assumed to be Base64 encoded
      await this.rnfs.writeFile(filePath, data, 'base64');
      const arrayBuffer = decodeBase64(data);
      size = arrayBuffer.byteLength;
    } else {
      const base64 = encodeBase64(data);
      await this.rnfs.writeFile(filePath, base64, 'base64');
      size = data.byteLength;
    }

    return size;
  }

  async readFile(filePath: string): Promise<ArrayBuffer> {
    const content = await this.rnfs.readFile(filePath, 'base64');
    return decodeBase64(content);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await this.rnfs.unlink(filePath);
    } catch (error: any) {
      // Ignore file not found errors
      if (error.code === 'ENOENT' || error.message?.includes('ENOENT') || error.message?.includes('not exist')) {
        return;
      }
      throw new Error(`Failed to delete file at ${filePath}: ${error.message}`, { cause: error });
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.rnfs.exists(filePath);
    } catch (error: any) {
      // Only return false for file-not-found errors
      if (error.code === 'ENOENT' || error.message?.includes('ENOENT') || error.message?.includes('not exist')) {
        return false;
      }
      throw new Error(`Failed to check existence of file at ${filePath}: ${error.message}`, { cause: error });
    }
  }

  async makeDir(path: string): Promise<void> {
    const dirExists = await this.rnfs.exists(path);
    if (!dirExists) {
      await this.rnfs.mkdir(path);
    }
  }

  async rmDir(path: string): Promise<void> {
    await this.rnfs.unlink(path);
  }
}
