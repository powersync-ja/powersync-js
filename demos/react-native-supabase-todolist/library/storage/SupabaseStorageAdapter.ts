import { SupabaseClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import { AppConfig } from '../supabase/AppConfig';
import { BaseStorageAdapter } from './BaseStorageAdapter';

export interface SupabaseStorageAdapterOptions {
  client: SupabaseClient;
}

export class SupabaseStorageAdapter extends BaseStorageAdapter {
  constructor(private options: SupabaseStorageAdapterOptions) {
    super();
  }

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
}
