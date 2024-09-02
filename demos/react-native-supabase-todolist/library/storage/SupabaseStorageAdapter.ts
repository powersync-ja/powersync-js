import { SupabaseClient } from '@supabase/supabase-js';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { AppConfig } from '../supabase/AppConfig';
import { StorageAdapter } from '@powersync/attachments';

export interface SupabaseStorageAdapterOptions {
  client: SupabaseClient;
}

export class SupabaseStorageAdapter implements StorageAdapter {
  constructor(private options: SupabaseStorageAdapterOptions) {}

  async uploadFile(
    filename: string,
    data: ArrayBuffer,
    options?: {
      mediaType?: string;
    }
  ): Promise<void> {
    if (!AppConfig.supabaseBucket) {
      throw new Error('Supabase bucket not configured in AppConfig.ts');
    }

    const { mediaType = 'text/plain' } = options ?? {};

    const res = await this.options.client.storage
      .from(AppConfig.supabaseBucket)
      .upload(filename, data, { contentType: mediaType });

    if (res.error) {
      throw res.error;
    }
  }

  async downloadFile(filePath: string) {
    if (!AppConfig.supabaseBucket) {
      throw new Error('Supabase bucket not configured in AppConfig.ts');
    }
    const { data, error } = await this.options.client.storage.from(AppConfig.supabaseBucket).download(filePath);
    if (error) {
      throw error;
    }

    return data as Blob;
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

  async deleteFile(uri: string, options?: { filename?: string }): Promise<void> {
    if (await this.fileExists(uri)) {
      await FileSystem.deleteAsync(uri);
    }

    const { filename } = options ?? {};
    if (!filename) {
      return;
    }

    if (!AppConfig.supabaseBucket) {
      throw new Error('Supabase bucket not configured in AppConfig.ts');
    }

    const { data, error } = await this.options.client.storage.from(AppConfig.supabaseBucket).remove([filename]);
    if (error) {
      console.debug('Failed to delete file from Cloud Storage', error);
      throw error;
    }

    console.debug('Deleted file from storage', data);
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
}
