import type { AttachmentRecord, AttachmentTransportAdapter, LocatedAttachmentRecord } from '@powersync/common';

/**
 * Describes the HTTP request used to upload a file's bytes to remote storage.
 * Typically points at a presigned URL.
 */
export interface ExpoUploadRequest {
  /** Destination URL (e.g. a presigned upload URL). */
  url: string;
  /** HTTP method. Defaults to `PUT`. */
  httpMethod?: 'POST' | 'PUT' | 'PATCH';
  /** Additional request headers. */
  headers?: Record<string, string>;
  /**
   * Upload encoding, matching Expo's `FileSystemUploadType`
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
export interface ExpoDownloadRequest {
  /** Source URL (e.g. a presigned download URL). */
  url: string;
  /** Additional request headers. */
  headers?: Record<string, string>;
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

type ExpoUploadResult = { status: number; body?: string };
type ExpoDownloadResult = { status: number; uri: string };

interface ExpoFileSystemLegacy {
  uploadAsync(url: string, fileUri: string, options?: Record<string, unknown>): Promise<ExpoUploadResult>;
  downloadAsync(uri: string, fileUri: string, options?: Record<string, unknown>): Promise<ExpoDownloadResult>;
  FileSystemUploadType?: { BINARY_CONTENT: number; MULTIPART: number };
}

/** Upload encodings, mirroring Expo's `FileSystemUploadType`. */
const UPLOAD_TYPE_BINARY_CONTENT = 0;

/**
 * ExpoFileSystemTransportAdapter transfers attachment bytes directly between a local
 * file URI and remote storage using Expo's native `uploadAsync` / `downloadAsync`.
 *
 * The bytes never enter the JS heap, so large files can be transferred without the
 * memory pressure of the buffer-based transport. Requires `expo-file-system` (its
 * `uploadAsync` / `downloadAsync` functions, available via `expo-file-system/legacy`
 * on SDK 54+).
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class ExpoFileSystemTransportAdapter implements AttachmentTransportAdapter {
  private fs: ExpoFileSystemLegacy;

  constructor(private options: ExpoFileSystemTransportAdapterOptions) {
    // `uploadAsync` / `downloadAsync` live in `expo-file-system/legacy` on SDK 54+,
    // and in the main module on older SDKs. Metro only bundles static `require`
    // string literals, so each candidate is required explicitly.
    let resolved: ExpoFileSystemLegacy | undefined;
    try {
      const legacy = require('expo-file-system/legacy');
      if (typeof legacy?.uploadAsync === 'function' && typeof legacy?.downloadAsync === 'function') {
        resolved = legacy;
      }
    } catch {
      // `/legacy` subpath not available on this SDK; fall back to the main module.
    }
    if (!resolved) {
      try {
        const main = require('expo-file-system');
        if (typeof main?.uploadAsync === 'function' && typeof main?.downloadAsync === 'function') {
          resolved = main;
        }
      } catch {
        // expo-file-system not installed.
      }
    }

    if (!resolved) {
      throw new Error(`Could not resolve expo-file-system's uploadAsync/downloadAsync.
To use the Expo File System transport please install expo-file-system.`);
    }

    this.fs = resolved;
  }

  async upload(attachment: LocatedAttachmentRecord): Promise<void> {
    const request = await this.options.resolveUpload(attachment);
    const binaryContent = this.fs.FileSystemUploadType?.BINARY_CONTENT ?? UPLOAD_TYPE_BINARY_CONTENT;

    const result = await this.fs.uploadAsync(request.url, attachment.localUri, {
      httpMethod: request.httpMethod ?? 'PUT',
      uploadType: request.uploadType ?? binaryContent,
      headers: request.headers,
      fieldName: request.fieldName,
      mimeType: request.mimeType ?? attachment.mediaType
    });

    if (!this.isOk(result.status)) {
      throw new Error(`Upload for ${attachment.id} failed with status ${result.status}: ${result.body ?? ''}`);
    }
  }

  async download(attachment: LocatedAttachmentRecord): Promise<void> {
    const request = await this.options.resolveDownload(attachment);

    const result = await this.fs.downloadAsync(request.url, attachment.localUri, {
      headers: request.headers
    });

    if (!this.isOk(result.status)) {
      throw new Error(`Download for ${attachment.id} failed with status ${result.status}`);
    }
  }

  async delete(attachment: AttachmentRecord): Promise<void> {
    await this.options.deleteFile(attachment);
  }

  private isOk(status: number): boolean {
    return status >= 200 && status < 300;
  }
}
