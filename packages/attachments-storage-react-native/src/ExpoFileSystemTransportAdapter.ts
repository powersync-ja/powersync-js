import type { AttachmentRecord, AttachmentTransportAdapter, LocatedAttachmentRecord } from '@powersync/common';
import type { DownloadOptions, UploadType } from 'expo-file-system';

/**
 * Describes the HTTP request used to upload a file's bytes to remote storage.
 * Typically points at a presigned URL.
 *
 * These fields are declared by hand rather than extending Expo's `UploadOptions`
 * (as {@link ExpoDownloadRequest} does with `DownloadOptions`): `UploadOptions` only
 * exists in `expo-file-system` 56+, while the storage adapter supports back to 19, so
 * referencing it here would break the types for those older consumers.
 */
export interface ExpoUploadRequest {
  /** Destination URL (e.g. a presigned upload URL). */
  url: string;
  /** HTTP method. Defaults to `PUT`. */
  httpMethod?: 'POST' | 'PUT' | 'PATCH';
  /** Additional request headers. */
  headers?: Record<string, string>;
  /**
   * Upload encoding, matching Expo's `UploadType`
   * (`0` = binary content, `1` = multipart). Defaults to binary content.
   */
  uploadType?: number;
  /** Form field name, used only for multipart uploads. */
  fieldName?: string;
  /** MIME type of the file. Defaults to the attachment's `mediaType`. */
  mimeType?: string;
}

/**
 * Describes the HTTP request used to download a file's bytes from remote storage.
 * Typically points at a presigned URL.
 */
export interface ExpoDownloadRequest extends DownloadOptions {
  /** Source URL (e.g. a presigned download URL). */
  url: string;
}

/**
 * Configuration for {@link ExpoFileSystemTransportAdapter}.
 *
 * The resolvers map an attachment to the request that transfers its bytes, keeping
 * the transport agnostic of the remote storage backend (S3, Supabase, etc.).
 */
export interface ExpoFileSystemTransportAdapterOptions {
  /** Resolves the upload request (e.g. a presigned URL) for an attachment. */
  resolveUpload: (attachment: LocatedAttachmentRecord) => Promise<ExpoUploadRequest> | ExpoUploadRequest;
  /** Resolves the download request (e.g. a presigned URL) for an attachment. */
  resolveDownload: (attachment: LocatedAttachmentRecord) => Promise<ExpoDownloadRequest> | ExpoDownloadRequest;
  /**
   * Deletes the attachment's file from remote storage (e.g. a storage SDK call or a
   * `DELETE` request). Delete is a plain remote operation, not a file transfer.
   */
  deleteFile: (attachment: AttachmentRecord) => Promise<void>;
}

/**
 * ExpoFileSystemTransportAdapter transfers attachment bytes directly between a local
 * file and remote storage using Expo's native `File.prototype.upload` /
 * `File.downloadFileAsync`.
 *
 * The bytes never enter the JS heap, so large files can be transferred without the
 * memory pressure of the buffer-based transport. Requires the modern upload API,
 * available in `expo-file-system` SDK 56+; construct it via
 * {@link ExpoFileSystemStorageAdapter.createTransportAdapter}.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class ExpoFileSystemTransportAdapter implements AttachmentTransportAdapter {
  constructor(
    private File: typeof import('expo-file-system').File,
    private options: ExpoFileSystemTransportAdapterOptions
  ) {}

  async upload(attachment: LocatedAttachmentRecord): Promise<void> {
    const request = await this.options.resolveUpload(attachment);

    const result = await new this.File(attachment.localUri).upload(request.url, {
      httpMethod: request.httpMethod ?? 'PUT',
      uploadType: request.uploadType as UploadType | undefined,
      headers: request.headers,
      fieldName: request.fieldName,
      mimeType: request.mimeType ?? attachment.mediaType
    });

    if (!this.isOk(result.status)) {
      throw new Error(`Upload for ${attachment.id} failed with status ${result.status}: ${result.body ?? ''}`);
    }
  }

  async download(attachment: LocatedAttachmentRecord): Promise<void> {
    const { url, ...options } = await this.options.resolveDownload(attachment);

    try {
      // `downloadFileAsync` rejects on a non-2xx response; `idempotent` overwrites any existing file by default.
      await this.File.downloadFileAsync(url, new this.File(attachment.localUri), { idempotent: true, ...options });
    } catch (error) {
      throw new Error(`Download for ${attachment.id} failed`, { cause: error });
    }
  }

  async delete(attachment: AttachmentRecord): Promise<void> {
    await this.options.deleteFile(attachment);
  }

  private isOk(status: number): boolean {
    return status >= 200 && status < 300;
  }
}
