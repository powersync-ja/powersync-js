import { decode as decodeBase64, encode as encodeBase64 } from 'base64-arraybuffer';
import { AttachmentData, EncodingType, LocalStorageAdapter } from '@powersync/common';

type ExpoFileSystemModule = {
  getInfoAsync(path: string): Promise<{ exists: boolean }>;
  makeDirectoryAsync(path: string, options?: { intermediates?: boolean }): Promise<void>;
  deleteAsync(path: string): Promise<void>;
  writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: EncodingType.Base64 | EncodingType.UTF8 }
  ): Promise<void>;
  readAsStringAsync(
    fileUri: string,
    options?: { encoding?: EncodingType.Base64 | EncodingType.UTF8 }
  ): Promise<string>;
  documentDirectory: string | null;
};

/**
 * ExpoFileSystemStorageAdapter implements LocalStorageAdapter using Expo's file system API.
 * Suitable for React Native applications using Expo or Expo modules.
 *
 * @example
 * ```typescript
 * import { ExpoFileSystemStorageAdapter } from '@powersync/attachments-react-native';
 *
 * const adapter = new ExpoFileSystemStorageAdapter();
 * await adapter.initialize();
 * ```
 */
export class ExpoFileSystemStorageAdapter implements LocalStorageAdapter {
  private fs: ExpoFileSystemModule;
  private storageDirectory: string;

  constructor(storageDirectory?: string) {
    let fs: ExpoFileSystemModule;
    try {
      fs = require('expo-file-system');
    } catch (e) {
      throw new Error(`Could not resolve expo-file-system.
To use the Expo File System attachment adapter please install expo-file-system.`);
    }

    if (!fs.documentDirectory) {
      throw new Error(`expo-file-system documentDirectory is not available.`);
    }

    this.fs = fs;
    // Default to a subdirectory in the document directory
    this.storageDirectory = storageDirectory ?? `${fs.documentDirectory}attachments/`;
  }

  async initialize(): Promise<void> {
    const dirInfo = await this.fs.getInfoAsync(this.storageDirectory);
    if (!dirInfo.exists) {
      await this.fs.makeDirectoryAsync(this.storageDirectory, { intermediates: true });
    }
  }

  async clear(): Promise<void> {
    const dirInfo = await this.fs.getInfoAsync(this.storageDirectory);
    if (dirInfo.exists) {
      await this.fs.deleteAsync(this.storageDirectory);
    }
  }

  getLocalUri(filename: string): string {
    const separator = this.storageDirectory.endsWith('/') ? '' : '/';
    return `${this.storageDirectory}${separator}${filename}`;
  }

  async saveFile(
    filePath: string,
    data: AttachmentData,
    options?: { encoding?: EncodingType; mediaType?: string }
  ): Promise<number> {
    let size: number;

    if (typeof data === 'string') {
      // Handle string data (typically base64 or UTF8)
      const encoding = options?.encoding ?? EncodingType.Base64;
      await this.fs.writeAsStringAsync(filePath, data, {
        encoding: encoding === EncodingType.Base64 ? EncodingType.Base64 : EncodingType.UTF8
      });

      // Calculate size based on encoding
      if (encoding === EncodingType.Base64) {
        // Base64 string length / 4 * 3 gives approximate byte size
        size = Math.ceil((data.length / 4) * 3);
      } else {
        // UTF8: Use TextEncoder to get accurate byte count
        const encoder = new TextEncoder();
        size = encoder.encode(data).byteLength;
      }
    } else {
      // Handle ArrayBuffer data
      const base64 = encodeBase64(data);
      await this.fs.writeAsStringAsync(filePath, base64, {
        encoding: EncodingType.Base64
      });
      size = data.byteLength;
    }

    return size;
  }

  async readFile(filePath: string, options?: { encoding?: EncodingType; mediaType?: string }): Promise<ArrayBuffer> {
    const encoding = options?.encoding ?? EncodingType.Base64;

    // Let the native function throw if file doesn't exist
    const content = await this.fs.readAsStringAsync(filePath, {
      encoding: encoding === EncodingType.Base64 ? EncodingType.Base64 : EncodingType.UTF8
    });

    if (encoding === EncodingType.UTF8) {
      // Convert UTF8 string to ArrayBuffer
      const encoder = new TextEncoder();
      return encoder.encode(content).buffer;
    } else {
      // Convert base64 string to ArrayBuffer
      return decodeBase64(content);
    }
  }

  async deleteFile(filePath: string, options?: { filename?: string }): Promise<void> {
    await this.fs.deleteAsync(filePath).catch((error: any) => {
      // Gracefully ignore file not found errors, throw others
      if (error?.message?.includes('not exist') || error?.message?.includes('ENOENT')) {
        return;
      }
      throw error;
    });
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const info = await this.fs.getInfoAsync(filePath);
      return info.exists;
    } catch {
      return false;
    }
  }

  async makeDir(path: string): Promise<void> {
    await this.fs.makeDirectoryAsync(path, { intermediates: true });
  }

  async rmDir(path: string): Promise<void> {
    await this.fs.deleteAsync(path);
  }
}