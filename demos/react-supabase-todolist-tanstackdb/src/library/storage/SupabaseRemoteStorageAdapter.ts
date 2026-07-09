import { type AttachmentRecord, RemoteStorageAdapter } from '@powersync/web';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseRemoteStorageAdapterOptions {
  client: SupabaseClient;
  bucket: string;
}

/**
 * Implements RemoteStorageAdapter for Supabase Storage.
 * Handles upload, download, and deletion of files from a Supabase Storage bucket.
 */
export class SupabaseRemoteStorageAdapter implements RemoteStorageAdapter {
  constructor(private options: SupabaseRemoteStorageAdapterOptions) {}

  async uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord): Promise<void> {
    const mediaType = attachment.mediaType ?? 'application/octet-stream';

    const { error } = await this.options.client.storage
      .from(this.options.bucket)
      .upload(attachment.filename, fileData, { contentType: mediaType });

    if (error) {
      throw error;
    }
  }

  async downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer> {
    const { data, error } = await this.options.client.storage.from(this.options.bucket).download(attachment.filename);

    if (error) {
      throw error;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(data);
    });
  }

  async deleteFile(attachment: AttachmentRecord): Promise<void> {
    const { error } = await this.options.client.storage.from(this.options.bucket).remove([attachment.filename]);

    if (error) {
      console.debug('Failed to delete file from Supabase Storage', error);
      throw error;
    }
  }
}
