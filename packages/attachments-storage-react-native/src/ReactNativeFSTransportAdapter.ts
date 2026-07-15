import type { AttachmentTransportAdapter, LocatedAttachmentRecord } from '@powersync/common';

/**
 * Describes the HTTP request used to upload a file's bytes to remote storage.
 * Typically points at a presigned URL.
 */
export interface ReactNativeFSUploadRequest {
  /** Destination URL (e.g. a presigned upload URL). */
  url: string;
  /** HTTP method. Defaults to `PUT`. */
  httpMethod?: 'POST' | 'PUT' | 'PATCH';
  /** Additional request headers. */
  headers?: Record<string, string>;
  /**
   * Send the raw file bytes as the request body instead of a multipart form.
   * Defaults to `true` — required for presigned `PUT` uploads (S3, Supabase, etc.).
   */
  binaryStreamOnly?: boolean;
  /** MIME type of the file. Defaults to the attachment's `mediaType`. */
  mimeType?: string;
}

/**
 * Describes the HTTP request used to download a file's bytes from remote storage.
 * Typically points at a presigned URL.
 */
export interface ReactNativeFSDownloadRequest {
  /** Source URL (e.g. a presigned download URL). */
  url: string;
  /** Additional request headers. */
  headers?: Record<string, string>;
}

/**
 * Configuration for {@link ReactNativeFSTransportAdapter}.
 *
 * The resolvers map an attachment to the request that transfers its bytes, keeping
 * the transport agnostic of the remote storage backend (S3, Supabase, etc.).
 */
export interface ReactNativeFSTransportAdapterOptions {
  /** Resolves the upload request (e.g. a presigned URL) for an attachment. */
  resolveUpload: (attachment: LocatedAttachmentRecord) => Promise<ReactNativeFSUploadRequest> | ReactNativeFSUploadRequest;
  /** Resolves the download request (e.g. a presigned URL) for an attachment. */
  resolveDownload: (
    attachment: LocatedAttachmentRecord
  ) => Promise<ReactNativeFSDownloadRequest> | ReactNativeFSDownloadRequest;
}

/**
 * ReactNativeFSTransportAdapter transfers attachment bytes directly between a local
 * file and remote storage using `@dr.pogodin/react-native-fs`'s native
 * `uploadFiles` / `downloadFile`.
 *
 * The bytes never enter the JS heap, so large files can be transferred without the
 * memory pressure of the buffer-based transport. Requires
 * `@dr.pogodin/react-native-fs`.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class ReactNativeFSTransportAdapter implements AttachmentTransportAdapter {
  private rnfs: typeof import('@dr.pogodin/react-native-fs');

  constructor(private options: ReactNativeFSTransportAdapterOptions) {
    let rnfs: typeof import('@dr.pogodin/react-native-fs');
    try {
      rnfs = require('@dr.pogodin/react-native-fs');
    } catch (e) {
      throw new Error(`Could not resolve @dr.pogodin/react-native-fs.
To use the React Native File System transport please install @dr.pogodin/react-native-fs.`);
    }

    this.rnfs = rnfs;
  }

  async upload(attachment: LocatedAttachmentRecord): Promise<void> {
    const request = await this.options.resolveUpload(attachment);

    const { promise } = this.rnfs.uploadFiles({
      toUrl: request.url,
      method: request.httpMethod ?? 'PUT',
      binaryStreamOnly: request.binaryStreamOnly ?? true,
      headers: request.headers,
      files: [
        {
          name: 'file',
          filename: attachment.filename,
          filepath: this.toPath(attachment.localUri),
          filetype: request.mimeType ?? attachment.mediaType
        }
      ]
    });

    const result = await promise;
    if (!this.isOk(result.statusCode)) {
      throw new Error(`Upload for ${attachment.id} failed with status ${result.statusCode}: ${result.body ?? ''}`);
    }
  }

  async download(attachment: LocatedAttachmentRecord): Promise<void> {
    const request = await this.options.resolveDownload(attachment);

    const { promise } = this.rnfs.downloadFile({
      fromUrl: request.url,
      toFile: this.toPath(attachment.localUri),
      headers: request.headers
    });

    const result = await promise;
    if (!this.isOk(result.statusCode)) {
      throw new Error(`Download for ${attachment.id} failed with status ${result.statusCode}`);
    }
  }

  /** react-native-fs expects plain filesystem paths, not `file://` URIs. */
  private toPath(uri: string): string {
    return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  }

  private isOk(status: number): boolean {
    return status >= 200 && status < 300;
  }
}
