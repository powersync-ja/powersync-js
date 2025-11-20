import { promises as fs } from 'fs';
import * as path from 'path';
import { AttachmentData, EncodingType, LocalStorageAdapter } from '@powersync/common';

/**
 * NodeFileSystemAdapter implements LocalStorageAdapter using Node.js filesystem.
 * Suitable for Node.js environments and Electron applications.
 */
export class NodeFileSystemAdapter implements LocalStorageAdapter {
  constructor(private storageDirectory: string = './user_data') {}

  async initialize(): Promise<void> {
    const dir = path.resolve(this.storageDirectory);
    await fs.mkdir(dir, { recursive: true });
  }

  async clear(): Promise<void> {
    const dir = path.resolve(this.storageDirectory);
    await fs.rmdir(dir, { recursive: true });
  }

  getLocalUri(filename: string): string {
    return path.join(path.resolve(this.storageDirectory), filename);
  }

  async uploadFile(filePath: string, data: ArrayBuffer, options?: { encoding: EncodingType }): Promise<void> {
    const buffer = Buffer.from(data);
    await fs.writeFile(filePath, buffer, {
      encoding: options?.encoding
    });
  }

  async downloadFile(filePath: string): Promise<Blob> {
    const data = await fs.readFile(filePath);
    return new Blob([new Uint8Array(data)]);
  }

  async saveFile(
    filePath: string,
    data: AttachmentData,
    options?: { encoding?: EncodingType; mediaType?: string }
  ): Promise<number> {
    let buffer: Buffer;

    if (typeof data === 'string') {
      buffer = Buffer.from(data, options?.encoding ?? EncodingType.Base64);
    } else {
      buffer = Buffer.from(data);
    }
    await fs.writeFile(filePath, buffer);
    return buffer.length;
  }

  async readFile(filePath: string, options?: { encoding?: EncodingType; mediaType?: string }): Promise<ArrayBuffer> {
    const data = await fs.readFile(filePath);
    if (options?.encoding === EncodingType.Base64) {
      return Buffer.from(data.toString(), 'base64').buffer;
    } else {
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    }
  }

  async deleteFile(path: string, options?: { filename?: string }): Promise<void> {
    await fs.unlink(path).catch((err) => {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    });
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async makeDir(path: string): Promise<void> {
    await fs.mkdir(path, { recursive: true });
  }

  async rmDir(path: string): Promise<void> {
    await fs.rmdir(path, { recursive: true });
  }
}
