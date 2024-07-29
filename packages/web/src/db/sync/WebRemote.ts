import { type ILogger } from 'js-logger';

import {
  AbstractRemote,
  AbstractRemoteOptions,
  BSONImplementation,
  DEFAULT_REMOTE_LOGGER,
  FetchImplementation,
  FetchImplementationProvider,
  RemoteConnector
} from '@powersync/common';

/*
 * Depends on browser's implementation of global fetch.
 */
class WebFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return fetch.bind(globalThis);
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
      fetchImplementation: options?.fetchImplementation ?? new WebFetchProvider()
    });
  }

  async getBSON(): Promise<BSONImplementation> {
    if (this._bson) {
      return this._bson;
    }

    /**
     * Dynamic import to be used only when needed.
     */
    const { BSON } = await import('bson');
    this._bson = BSON;
    return this._bson;
  }
}
