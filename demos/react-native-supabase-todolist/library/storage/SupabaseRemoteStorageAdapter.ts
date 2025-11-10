import { SupabaseClient } from '@supabase/supabase-js';
import { AttachmentRecord, RemoteStorageAdapter } from '@powersync/attachments';

export interface SupabaseRemoteStorageAdapterOptions {
  client: SupabaseClient;
  bucket: string;
}

/**
 * SupabaseRemoteStorageAdapter implements RemoteStorageAdapter for Supabase Storage.
 * Handles upload, download, and deletion of files from Supabase Storage buckets.
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
    const { data, error } = await this.options.client.storage
      .from(this.options.bucket)
      .download(attachment.filename);

    if (error) {
      throw error;
    }

    // Convert Blob to ArrayBuffer
    return await data.arrayBuffer();
  }

  async deleteFile(attachment: AttachmentRecord): Promise<void> {
    const { error } = await this.options.client.storage
      .from(this.options.bucket)
      .remove([attachment.filename]);

    if (error) {
      console.debug('Failed to delete file from Supabase Storage', error);
      throw error;
    }
  }
}

