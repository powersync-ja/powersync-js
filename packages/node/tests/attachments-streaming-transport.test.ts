import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import { AttachmentRecord, AttachmentState, NodeFileSystemAdapter } from '../lib/index.js';

const storage = new NodeFileSystemAdapter('./temp/streaming-transport');

// Bytes received per request path, and the headers of the last request to each path.
const stored = new Map<string, Buffer>();
const receivedHeaders = new Map<string, Record<string, string | string[] | undefined>>();

let server: Server;
let baseUrl: string;

const makeRecord = (localUri: string, extra: Partial<AttachmentRecord> = {}): AttachmentRecord & { localUri: string } => ({
  id: 'att-1',
  filename: 'file.bin',
  state: AttachmentState.QUEUED_UPLOAD,
  localUri,
  ...extra
});

beforeAll(async () => {
  await storage.initialize();

  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      receivedHeaders.set(url.pathname, req.headers);

      if (url.pathname === '/fail') {
        res.writeHead(500);
        res.end('server error');
        return;
      }

      switch (req.method) {
        case 'PUT':
          stored.set(url.pathname, Buffer.concat(chunks));
          res.writeHead(200);
          res.end();
          break;
        case 'GET': {
          const data = stored.get(url.pathname);
          if (!data) {
            res.writeHead(404);
            res.end();
          } else {
            res.writeHead(200);
            res.end(data);
          }
          break;
        }
        default:
          res.writeHead(405);
          res.end();
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await storage.clear();
});

beforeEach(() => {
  stored.clear();
  receivedHeaders.clear();
});

describe('NodeFileSystemAdapter streaming transport', () => {
  it('streams a local file to the resolved upload URL with Content-Length and headers', async () => {
    const localUri = storage.getLocalUri('upload.bin');
    const payload = new Uint8Array(2048).map((_, i) => i % 256);
    await storage.saveFile(localUri, payload.buffer);

    const transport = storage.createTransportAdapter({
      resolveUpload: () => ({
        url: `${baseUrl}/obj/up`,
        httpMethod: 'PUT',
        headers: { 'x-custom': 'value' },
        mimeType: 'application/octet-stream'
      }),
      resolveDownload: () => ({ url: '' }),
      deleteFile: async () => {}
    });

    await transport.upload(makeRecord(localUri));

    // The adapter streamed the file's exact bytes to the resolved URL...
    expect(new Uint8Array(stored.get('/obj/up')!)).toEqual(payload);
    // ...and forwarded the resolver's headers (auth/presigned headers depend on this).
    expect(receivedHeaders.get('/obj/up')!['x-custom']).toBe('value');
  });

  it('streams a remote file into localUri on download', async () => {
    const payload = new Uint8Array(4096).map((_, i) => (i * 7) % 256);
    stored.set('/obj/down', Buffer.from(payload));

    const localUri = storage.getLocalUri('download.bin');
    const transport = storage.createTransportAdapter({
      resolveUpload: () => ({ url: '' }),
      resolveDownload: () => ({ url: `${baseUrl}/obj/down`, headers: { 'x-custom': 'value' } }),
      deleteFile: async () => {}
    });

    await transport.download(makeRecord(localUri));

    const written = new Uint8Array(await storage.readFile(localUri));
    expect(written).toEqual(payload);
    expect(receivedHeaders.get('/obj/down')!['x-custom']).toBe('value');
  });

  it('throws with the status code when an upload returns a non-2xx response', async () => {
    const localUri = storage.getLocalUri('upload-fail.bin');
    await storage.saveFile(localUri, new Uint8Array(16).fill(1).buffer);

    const transport = storage.createTransportAdapter({
      resolveUpload: () => ({ url: `${baseUrl}/fail` }),
      resolveDownload: () => ({ url: '' }),
      deleteFile: async () => {}
    });

    await expect(transport.upload(makeRecord(localUri))).rejects.toThrow(/failed with status 500/);
  });

  it('delegates delete to the deleteFile callback', async () => {
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const transport = storage.createTransportAdapter({
      resolveUpload: () => ({ url: '' }),
      resolveDownload: () => ({ url: '' }),
      deleteFile
    });

    const record = makeRecord(storage.getLocalUri('irrelevant.bin'));
    await transport.delete(record);

    expect(deleteFile).toHaveBeenCalledWith(record);
  });
});
