import * as FileSystem from 'expo-file-system';
import { decode as decodeBase64, encode as encodeBase64 } from 'base64-arraybuffer';
import { AttachmentData, EncodingType, LocalStorageAdapter } from '@powersync/common';

/**
 * ExpoFileSystemAdapter implements LocalStorageAdapter using Expo's FileSystem.
 * Suitable for React Native applications using Expo or Expo modules.
 */
export class ExpoFileSystemAdapter implements LocalStorageAdapter {
  private storageDirectory: string;

  constructor(storageDirectory?: string) {
    // Default to a subdirectory in the document directory
    this.storageDirectory = storageDirectory ?? `${FileSystem.documentDirectory}attachments/`;
  }

  async initialize(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.storageDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.storageDirectory, { intermediates: true });
    }
  }

  async clear(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.storageDirectory);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(this.storageDirectory);
    }
  }

  getLocalUri(filename: string): string {
    return `${this.storageDirectory}${filename}`;
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
      await FileSystem.writeAsStringAsync(filePath, data, {
        encoding: encoding === EncodingType.Base64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8
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
      await FileSystem.writeAsStringAsync(filePath, base64, {
        encoding: FileSystem.EncodingType.Base64
      });
      size = data.byteLength;
    }

    return size;
  }

  async readFile(filePath: string, options?: { encoding?: EncodingType; mediaType?: string }): Promise<ArrayBuffer> {
    const encoding = options?.encoding ?? EncodingType.Base64;
    
    // Let the native function throw if file doesn't exist
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding: encoding === EncodingType.Base64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8
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
    await FileSystem.deleteAsync(filePath).catch((error: any) => {
      // Gracefully ignore file not found errors, throw others
      if (error?.message?.includes('not exist') || error?.message?.includes('ENOENT')) {
        return;
      }
      throw error;
    });
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      return info.exists;
    } catch {
      return false;
    }
  }

  async makeDir(path: string): Promise<void> {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }

  async rmDir(path: string): Promise<void> {
    await FileSystem.deleteAsync(path);
  }
}

