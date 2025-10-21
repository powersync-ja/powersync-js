import { promises as fs } from 'fs';
import * as path from 'path';
import { EncodingType, LocalStorageAdapter } from '../LocalStorageAdapter.js';

export class NodeFileSystemAdapter implements LocalStorageAdapter {
  async initialize(): Promise<void> {
    // const dir = this.getUserStorageDirectory();
    const dir = path.resolve('./user_data');
    await fs.mkdir(dir, { recursive: true });
  }

  async clear(): Promise<void> {
    // const dir = this.getUserStorageDirectory();
    const dir = path.resolve('./user_data');
    await fs.rmdir(dir, { recursive: true });
  }

  getLocalUri(filename: string): string {
    return path.join(path.resolve('./user_data'), filename);
  }

  async uploadFile(filePath: string, data: ArrayBuffer, options?: { encoding: EncodingType }): Promise<void> {
    const buffer = Buffer.from(data);
    await fs.writeFile(filePath, buffer, {
      encoding: options.encoding
    });
  }

  async downloadFile(filePath: string): Promise<Blob> {
    const data = await fs.readFile(filePath);
    return new Blob([new Uint8Array(data)]);
  }

  async saveFile(
    filePath: string,
    data: string,
    options?: { encoding?: EncodingType; mediaType?: string }
  ): Promise<number> {
    const buffer = options?.encoding === EncodingType.Base64 ? Buffer.from(data, 'base64') : Buffer.from(data, 'utf8');
    await fs.writeFile(filePath, buffer, {
      encoding: options?.encoding
    });
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
