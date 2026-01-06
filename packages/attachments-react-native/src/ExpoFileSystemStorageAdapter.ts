import { decode as decodeBase64 } from 'base64-arraybuffer';
import type { AttachmentData, LocalStorageAdapter } from '@powersync/common';
import { EncodingType } from '@powersync/common';
import type { File, Directory } from 'expo-file-system';

/**
 * ExpoFileSystemStorageAdapter implements LocalStorageAdapter using Expo's new File System API (SDK 54+).
 * Suitable for React Native applications using Expo SDK 54 or later.
 *
 * For Expo SDK 53 and below, use ExpoFileSystemLegacyStorageAdapter instead.
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
To use the Expo File System V2 attachment adapter please install expo-file-system (SDK 54+).`);
    }

    if (!fs.File || !fs.Directory || !fs.Paths) {
      throw new Error(`Expo File System V2 API not available. 
This adapter requires expo-file-system SDK 54+. For older versions, use ExpoFileSystemStorageAdapter.`);
    }

    if (!fs.Paths.document) {
      throw new Error(`expo-file-system Paths.document is not available.`);
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
    data: AttachmentData,
    options?: { encoding?: EncodingType; mediaType?: string }
  ): Promise<number> {
    const file = new this.File(filePath);
    let size: number;

    if (typeof data === 'string') {
      // Handle string data
      const encoding = options?.encoding ?? EncodingType.Base64;
      
      if (encoding === EncodingType.Base64) {
        // Decode base64 to ArrayBuffer for accurate size
        const arrayBuffer = decodeBase64(data);
        const bytes = new Uint8Array(arrayBuffer);
        // write expects string | Uint8Array, pass Uint8Array
        file.write(bytes);
        size = bytes.byteLength;
      } else {
        // UTF8 string
        file.write(data);
        const encoder = new TextEncoder();
        size = encoder.encode(data).byteLength;
      }
    } else {
      // Handle ArrayBuffer data
      const bytes = new Uint8Array(data);
      file.write(bytes);
      size = bytes.byteLength;
    }

    return size;
  }

  async readFile(filePath: string, options?: { encoding?: EncodingType; mediaType?: string }): Promise<ArrayBuffer> {
    const file = new this.File(filePath);
    
    // Let the native function throw if file doesn't exist
    const { buffer } = await file.bytes();
    return buffer;
  }

  async deleteFile(filePath: string, options?: { filename?: string }): Promise<void> {
    const file = new this.File(filePath);
    
    try {
      if (file.exists) {
        file.delete();
      }
    } catch (error: any) {
      // Gracefully ignore file not found errors, throw others
      if (error?.message?.includes('not exist') || error?.message?.includes('ENOENT')) {
        return;
      }
      throw new Error(`Failed to delete file at ${filePath}: ${error.message}`, { cause: error });
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const file = new this.File(filePath);
      return file.exists;
    } catch {
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
