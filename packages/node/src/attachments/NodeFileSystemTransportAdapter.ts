import { createReadStream, createWriteStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { AttachmentRecord, AttachmentTransportAdapter, LocatedAttachmentRecord } from '@powersync/common';

/**
 * Describes the HTTP request used to upload a file's bytes to remote storage.
 * Typically points at a presigned URL.
 */
export interface NodeUploadRequest {
  /** Destination URL (e.g. a presigned upload URL). */
  url: string;
  /** HTTP method. Defaults to `PUT`. */
  httpMethod?: 'POST' | 'PUT' | 'PATCH';
  /** Additional request headers. */
  headers?: Record<string, string>;
  /** MIME type of the file. Defaults to the attachment's `mediaType`. */
  mimeType?: string;
}

/**
 * Describes the HTTP request used to download a file's bytes from remote storage.
 * Typically points at a presigned URL.
 */
export interface NodeDownloadRequest {
  /** Source URL (e.g. a presigned download URL). */
  url: string;
  /** Additional request headers. */
  headers?: Record<string, string>;
}

/**
 * Configuration for the Node streaming transport.
 *
 * The resolvers map an attachment to the request that transfers its bytes, keeping
 * the transport agnostic of the remote storage backend (S3, Supabase, etc.).
 */
export interface NodeFileSystemTransportAdapterOptions {
  /** Resolves the upload request (e.g. a presigned URL) for an attachment. */
  resolveUpload: (attachment: LocatedAttachmentRecord) => Promise<NodeUploadRequest> | NodeUploadRequest;
  /** Resolves the download request (e.g. a presigned URL) for an attachment. */
  resolveDownload: (attachment: LocatedAttachmentRecord) => Promise<NodeDownloadRequest> | NodeDownloadRequest;
  /**
   * Deletes the attachment's file from remote storage (e.g. a storage SDK call or a
   * `DELETE` request). Delete is a plain remote operation, not a file transfer.
   */
  deleteFile: (attachment: AttachmentRecord) => Promise<void>;
}

/**
 * NodeFileSystemTransportAdapter transfers attachment bytes directly between a local
 * file and remote storage using `fetch` with Node filesystem streams.
 *
 * The bytes are streamed straight between disk and the network and never materialize
 * as an `ArrayBuffer` in the JS heap. Construct it via
 * {@link NodeFileSystemAdapter.createTransportAdapter}.
 *
 * @experimental
 * @alpha This is currently experimental and may change without a major version bump.
 */
export class NodeFileSystemTransportAdapter implements AttachmentTransportAdapter {
  constructor(private options: NodeFileSystemTransportAdapterOptions) {}

  async upload(attachment: LocatedAttachmentRecord): Promise<void> {
    const request = await this.options.resolveUpload(attachment);
    const { size } = await stat(attachment.localUri);

    const headers: Record<string, string> = {
      // Presigned PUT uploads (S3, Supabase, etc.) require a known length.
      'Content-Length': String(size),
      ...request.headers
    };
    const mimeType = request.mimeType ?? attachment.mediaType;
    if (mimeType) {
      headers['Content-Type'] = mimeType;
    }

    const response = await fetch(request.url, {
      method: request.httpMethod ?? 'PUT',
      headers,
      body: Readable.toWeb(createReadStream(attachment.localUri)) as ReadableStream,
      duplex: 'half'
    } as RequestInit & { duplex: 'half' });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Upload for ${attachment.id} failed with status ${response.status}: ${body}`);
    }
  }

  async download(attachment: LocatedAttachmentRecord): Promise<void> {
    const request = await this.options.resolveDownload(attachment);
    const response = await fetch(request.url, { headers: request.headers });

    if (!response.ok || !response.body) {
      throw new Error(`Download for ${attachment.id} failed with status ${response.status}`);
    }

    await pipeline(Readable.fromWeb(response.body as any), createWriteStream(attachment.localUri));
  }

  async delete(attachment: AttachmentRecord): Promise<void> {
    await this.options.deleteFile(attachment);
  }
}
