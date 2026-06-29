import { describe, expect, it, Mock, vi } from 'vitest';

import { PowerSyncFetchImplementation, ReactNativeRemote } from '../../src/sync/stream/ReactNativeRemote';
import { createConsoleLogger } from '@powersync/common';
import { FetchOptions } from '@powersync/shared-internals';

const connector = {
  fetchCredentials: async () => ({
    endpoint: 'https://example.com',
    token: 'token'
  })
};

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as Response;
}

function mockFetchImplementation(
  options?: Partial<PowerSyncFetchImplementation>
): [PowerSyncFetchImplementation, Mock<(options: FetchOptions) => Promise<Response>>] {
  const fetch = vi.fn(async (_options: FetchOptions) => jsonResponse({ ok: true }));

  const psFetchImpl: PowerSyncFetchImplementation = {
    supportsStreams: true,
    run: fetch,
    ...options
  };
  return [psFetchImpl, fetch];
}

const logger = createConsoleLogger();

describe('ReactNativeRemote', () => {
  it('does not use streaming for non-streaming GET requests', async () => {
    const [fetchImplementation, mock] = mockFetchImplementation();
    const remote = new ReactNativeRemote(connector, logger, { fetchImplementation });

    await remote.get('/write-checkpoint2.json');

    expect(mock).toHaveBeenCalledWith({
      resource: 'https://example.com/write-checkpoint2.json',
      request: expect.objectContaining({
        method: 'GET'
      }),
      expectStreamingResponse: false
    });
  });

  it('uses text streaming for non-streaming POST requests', async () => {
    const [fetchImplementation, mock] = mockFetchImplementation();
    const remote = new ReactNativeRemote(connector, logger, { fetchImplementation });

    try {
      await remote.fetchStream({
        path: '/sync/stream',
        data: {},
        abortSignal: new AbortController().signal
      });
    } catch {
      // This fails because the mock is incomplete, ignore.
    }

    expect(mock).toHaveBeenCalledWith({
      resource: 'https://example.com/sync/stream',
      request: expect.objectContaining({
        method: 'POST'
      }),
      expectStreamingResponse: true
    });
  });

  it('throws when attempting to stream with unsupported fetch', async () => {
    const [fetchImplementation, mock] = mockFetchImplementation({ supportsStreams: false });
    const remote = new ReactNativeRemote(connector, logger, { fetchImplementation });

    await expect(
      remote.fetchStream({
        path: '/sync/stream',
        data: {},
        abortSignal: new AbortController().signal
      })
    ).rejects.toThrow(
      'The PowerSync SDK requires a fetch() implementation capable of streaming responses, which React Native does not support natively.'
    );
  });
});
