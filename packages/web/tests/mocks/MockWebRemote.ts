import {
  AbstractRemote,
  AbstractRemoteOptions,
  BSONImplementation,
  DEFAULT_REMOTE_LOGGER,
  FetchImplementation,
  FetchImplementationProvider,
  ILogger,
  RemoteConnector
} from '@powersync/common';

/**
 * Mock WebRemote that throws 401 Unauthorized errors for all HTTP requests.
 * Used for testing error handling in the shared sync worker.
 * Other tests may override this for managed streams.
 */
class MockFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    // Return a mock fetch that always returns 401
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const response = new Response(null, {
        status: 401,
        statusText: 'Unauthorized'
      });
      return response;
    };
  }
}

export class WebRemote extends AbstractRemote {
  private _bson: BSONImplementation | undefined;

  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    super(connector, logger, {
      ...(options ?? {}),
      fetchImplementation: options?.fetchImplementation ?? new MockFetchProvider()
    });
  }

  getUserAgent(): string {
    return 'powersync-web-mock';
  }

  async getBSON(): Promise<BSONImplementation> {
    if (this._bson) {
      return this._bson;
    }
    const { BSON } = await import('bson');
    this._bson = BSON;
    return this._bson;
  }
}
