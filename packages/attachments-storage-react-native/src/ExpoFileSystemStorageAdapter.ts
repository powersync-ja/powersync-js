import { decode as decodeBase64 } from 'base64-arraybuffer';
import type { AttachmentData, LocalStorageAdapter } from '@powersync/common';
import type { File, Directory } from 'expo-file-system';

/**
 * ExpoFileSystemStorageAdapter implements LocalStorageAdapter using Expo's new File System API (SDK 54+).
 * Suitable for React Native applications using Expo SDK 54 or later.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class ExpoFileSystemStorageAdapter implements LocalStorageAdapter {
  private File: typeof File;
  private Directory: typeof Directory;
  private storageDir: Directory;

  constructor(storageDirectory?: string) {
    let fs: typeof import('expo-file-system');
    try {
      fs = require('expo-file-system');
    } catch (e) {
      throw new Error(`Could not resolve expo-file-system.
To use the Expo File System attachment adapter please install expo-file-system (SDK 54+).`);
    }

    if (!fs.File || !fs.Directory || !fs.Paths) {
      throw new Error(`Expo File System API not available. This adapter requires expo-file-system SDK 54+.`);
    }

    this.File = fs.File;
    this.Directory = fs.Directory;
    
    // Default to a subdirectory in the document directory
    const basePath = storageDirectory ?? fs.Paths.document;
    this.storageDir = new fs.Directory(basePath, 'attachments');
  }

  async initialize(): Promise<void> {
    if (!this.storageDir.exists) {
      this.storageDir.create();
    }
  }

  async clear(): Promise<void> {
    if (this.storageDir.exists) {
      this.storageDir.delete();
    }
  }

  getLocalUri(filename: string): string {
    return new this.File(this.storageDir, filename).uri;
  }

  async saveFile(
    filePath: string,
    data: AttachmentData
  ): Promise<number> {
    const file = new this.File(filePath);
    let size: number;

    if (typeof data === 'string') {
      // String data is assumed to be Base64 encoded
      const arrayBuffer = decodeBase64(data);
      const bytes = new Uint8Array(arrayBuffer);
      file.write(bytes);
      size = bytes.byteLength;
    } else {
      // Handle ArrayBuffer data
      const bytes = new Uint8Array(data);
      file.write(bytes);
      size = bytes.byteLength;
    }

    return size;
  }

  async readFile(filePath: string, mediaType?: string): Promise<ArrayBuffer> {
    const file = new this.File(filePath);
    
    const { buffer } = await file.bytes();
    return buffer;
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const file = new this.File(filePath);
      if (file.exists) {
        file.delete();
      }
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.message?.includes('ENOENT') || error.message?.includes('not exist')) {
        return;
      }
      throw new Error(`Failed to delete file at ${filePath}: ${error.message}`, { cause: error });
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const file = new this.File(filePath);
      return file.exists;
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.message?.includes('ENOENT')) {
        return false;
      }
      return false;
    }
  }

  async makeDir(path: string): Promise<void> {
    const dir = new this.Directory(path);
    if (!dir.exists) {
       dir.create();
    }
  }

  async rmDir(path: string): Promise<void> {
    const dir = new this.Directory(path);
    if (dir.exists) {
      dir.delete();
    }
  }
}
