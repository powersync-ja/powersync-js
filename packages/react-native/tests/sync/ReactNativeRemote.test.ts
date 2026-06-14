import { describe, expect, it, vi } from 'vitest';

import { ReactNativeRemote } from '../../src/sync/stream/ReactNativeRemote';

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

describe('ReactNativeRemote', () => {
  it('uses text streaming for non-streaming GET requests', async () => {
    const fetchImplementation = vi.fn(async () => jsonResponse({ ok: true }));
    const remote = new ReactNativeRemote(connector, undefined, { fetchImplementation });

    await remote.get('/write-checkpoint2.json');

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://example.com/write-checkpoint2.json',
      expect.objectContaining({
        method: 'GET',
        reactNative: expect.objectContaining({
          textStreaming: true
        })
      })
    );
  });

  it('uses text streaming for non-streaming POST requests', async () => {
    const fetchImplementation = vi.fn(async () => jsonResponse({ ok: true }));
    const remote = new ReactNativeRemote(connector, undefined, { fetchImplementation });

    await remote.post('/crud', { op: 'put' });

    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://example.com/crud',
      expect.objectContaining({
        method: 'POST',
        reactNative: expect.objectContaining({
          textStreaming: true
        })
      })
    );
  });
});
