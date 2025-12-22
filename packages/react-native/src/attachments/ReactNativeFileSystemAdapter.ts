import { decode as decodeBase64, encode as encodeBase64 } from 'base64-arraybuffer';
import { AttachmentData, EncodingType, LocalStorageAdapter } from '@powersync/common';

type ReactNativeFsModule = {
  DocumentDirectoryPath: string;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
  writeFile(path: string, contents: string, encoding?: 'base64' | 'utf8'): Promise<void>;
  readFile(path: string, encoding?: 'base64' | 'utf8'): Promise<string>;
};

export class ReactNativeFileSystemStorageAdapter implements LocalStorageAdapter {
  private rnfs: ReactNativeFsModule;
  private storageDirectory: string;

  constructor(storageDirectory?: string) {
    let rnfs: ReactNativeFsModule;
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
    data: AttachmentData,
    options?: { encoding?: EncodingType; mediaType?: string }
  ): Promise<number> {
    let size: number;

    if (typeof data === 'string') {
      const encoding = options?.encoding ?? EncodingType.Base64;
      await this.rnfs.writeFile(filePath, data, encoding);

      // Calculate size based on encoding
      if (encoding === EncodingType.Base64) {
        size = Math.ceil((data.length / 4) * 3);
      } else {
        const encoder = new TextEncoder();
        size = encoder.encode(data).byteLength;
      }
    } else {
      const base64 = encodeBase64(data);
      await this.rnfs.writeFile(filePath, base64, 'base64');
      size = data.byteLength;
    }

    return size;
  }

  async readFile(filePath: string, options?: { encoding?: EncodingType; mediaType?: string }): Promise<ArrayBuffer> {
    const encoding = options?.encoding ?? EncodingType.Base64;

    const content = await this.rnfs.readFile(filePath, encoding);

    if (encoding === EncodingType.UTF8) {
      const encoder = new TextEncoder();
      return encoder.encode(content).buffer;
    } else {
      return decodeBase64(content);
    }
  }

  async deleteFile(filePath: string, options?: { filename?: string }): Promise<void> {
    try {
      await this.rnfs.unlink(filePath);
    } catch (error: any) {
      // Ignore file not found errors
      if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT') || error?.message?.includes('not exist')) {
        return;
      }
      throw error;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await this.rnfs.exists(filePath);
    } catch (error: any) {
      // Only return false for file-not-found errors
      if (error?.code === 'ENOENT' || error?.message?.includes('ENOENT')) {
        return false;
      }
      throw error;
    }
  }

  async makeDir(path: string): Promise<void> {
    await this.rnfs.mkdir(path);
  }

  async rmDir(path: string): Promise<void> {
    await this.rnfs.unlink(path);
  }
}
