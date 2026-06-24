import { describe, expect, it, vi } from 'vitest';

import { ReactNativeRemote } from '../../src/sync/stream/ReactNativeRemote';
import { createConsoleLogger } from '@powersync/common';

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

const logger = createConsoleLogger();

describe('ReactNativeRemote', () => {
  it('does not use streaming for non-streaming GET requests', async () => {
    const fetchImplementation = vi.fn(async () => jsonResponse({ ok: true }));
    const remote = new ReactNativeRemote(connector, logger, { fetchImplementation });

    await remote.get('/write-checkpoint2.json');

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://example.com/write-checkpoint2.json',
      expect.objectContaining({
        method: 'GET'
      })
    );
  });

  it('uses text streaming for non-streaming POST requests', async () => {
    const fetchImplementation = vi.fn(async () => jsonResponse({ ok: true }));
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

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://example.com/sync/stream',
      expect.objectContaining({
        method: 'POST',
        reactNative: expect.objectContaining({
          textStreaming: true
        })
      })
    );
  });
});
