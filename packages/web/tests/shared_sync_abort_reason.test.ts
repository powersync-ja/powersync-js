import * as Comlink from 'comlink';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SharedSyncImplementation, type WrappedSyncPort } from '../src/worker/sync/SharedSyncImplementation';
import type { AbstractSharedSyncClientProvider } from '../src/worker/sync/AbstractSharedSyncClientProvider';

describe('Shared sync abort reasons', { sequential: true }, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a cloneable abort reason when closing a client port', async () => {
    const implementation = new SharedSyncImplementation();
    const abortController = new AbortController();
    const { port1 } = new MessageChannel();

    const clientProvider = {
      fetchCredentials: vi.fn(async () => null),
      invalidateCredentials: vi.fn(),
      uploadCrud: vi.fn(async () => {}),
      statusChanged: vi.fn(),
      getDBWorkerPort: vi.fn(async () => port1),
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      time: vi.fn(),
      timeEnd: vi.fn(),
      [Comlink.releaseProxy]: vi.fn()
    } as unknown as Comlink.Remote<AbstractSharedSyncClientProvider>;

    const wrappedPort = {
      port: port1,
      clientProvider,
      currentSubscriptions: [],
      closeListeners: []
    } satisfies WrappedSyncPort;

    (implementation as any).ports.push(wrappedPort);
    (implementation as any).fetchCredentialsController = {
      controller: abortController,
      activePort: wrappedPort
    };

    const abortSpy = vi.spyOn(abortController, 'abort');
    await implementation.removePort(wrappedPort);

    expect(abortSpy).toHaveBeenCalled();
    const reason = abortSpy.mock.calls[0]?.[0];
    expect(typeof reason).toBe('string');
  });

  it('uses a cloneable abort reason when closing a client port with uploads in-flight', async () => {
    const implementation = new SharedSyncImplementation();
    const abortController = new AbortController();
    const { port1 } = new MessageChannel();

    const clientProvider = {
      fetchCredentials: vi.fn(async () => null),
      invalidateCredentials: vi.fn(),
      uploadCrud: vi.fn(async () => {}),
      statusChanged: vi.fn(),
      getDBWorkerPort: vi.fn(async () => port1),
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      time: vi.fn(),
      timeEnd: vi.fn(),
      [Comlink.releaseProxy]: vi.fn()
    } as unknown as Comlink.Remote<AbstractSharedSyncClientProvider>;

    const wrappedPort = {
      port: port1,
      clientProvider,
      currentSubscriptions: [],
      closeListeners: []
    } satisfies WrappedSyncPort;

    (implementation as any).ports.push(wrappedPort);
    (implementation as any).uploadDataController = {
      controller: abortController,
      activePort: wrappedPort
    };

    const abortSpy = vi.spyOn(abortController, 'abort');
    await implementation.removePort(wrappedPort);

    expect(abortSpy).toHaveBeenCalled();
    const reason = abortSpy.mock.calls[0]?.[0];
    expect(typeof reason).toBe('string');
  });
});
