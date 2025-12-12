import { decode as decodeBase64, encode as encodeBase64 } from 'base64-arraybuffer';
import { AttachmentData, EncodingType, LocalStorageAdapter } from '@powersync/common';

try {
  var rnfs = require('@dr.pogodin/react-native-fs');
} catch (e) {
  throw new Error(`Could not resolve @dr.pogodin/react-native-fs.
To use the React Native File System attachment adapter please install @dr.pogodin/react-native-fs.`);
}

export class ReactNativeFileSystemStorageAdapter implements LocalStorageAdapter {
  private storageDirectory: string;

  constructor(storageDirectory?: string) {
    // Default to a subdirectory in the document directory
    this.storageDirectory = storageDirectory ?? `${rnfs.DocumentDirectoryPath}/attachments/`;
  }

  async initialize(): Promise<void> {
    const dirExists = await rnfs.exists(this.storageDirectory);
    if (!dirExists) {
      await rnfs.mkdir(this.storageDirectory);
    }
  }

  async clear(): Promise<void> {
    const dirExists = await rnfs.exists(this.storageDirectory);
    if (dirExists) {
      await rnfs.unlink(this.storageDirectory);
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
      const encoding = options?.encoding ?? EncodingType.Base64;
      await rnfs.writeFile(filePath, data, encoding === EncodingType.Base64 ? 'base64' : 'utf8');

      // Calculate size based on encoding
      if (encoding === EncodingType.Base64) {
        size = Math.ceil((data.length / 4) * 3);
      } else {
        const encoder = new TextEncoder();
        size = encoder.encode(data).byteLength;
      }
    } else {
      const base64 = encodeBase64(data);
      await rnfs.WriteFile(filePath, base64, 'base64');
      size = data.byteLength;
    }

    return size;
  }

  async readFile(filePath: string, options?: { encoding?: EncodingType; mediaType?: string }): Promise<ArrayBuffer> {
    const encoding = options?.encoding ?? EncodingType.Base64;

    const content = await rnfs.readFile(filePath, encoding === EncodingType.Base64 ? 'base64' : 'utf8');

    if (encoding === EncodingType.UTF8) {
      const encoder = new TextEncoder();
      return encoder.encode(content).buffer;
    } else {
      return decodeBase64(content);
    }
  }

  async deleteFile(filePath: string, options?: { filename?: string }): Promise<void> {
    await rnfs.unlink(filePath).catch((error: any) => {
      if (error?.message?.includes('not exist') || error?.message?.includes('ENOENT')) {
        return;
      }
      throw error;
    });
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      return await rnfs.exists(filePath);
    } catch {
      return false;
    }
  }

  async makeDir(path: string): Promise<void> {
    await rnfs.mkdir(path);
  }

  async rmDir(path: string): Promise<void> {
    await rnfs.unlink(path);
  }
}
