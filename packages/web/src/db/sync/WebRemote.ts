import {
  AbstractRemote,
  AbstractRemoteOptions,
  DEFAULT_REMOTE_LOGGER,
  FetchImplementation,
  FetchImplementationProvider,
  ILogger,
  RemoteConnector
} from '@powersync/common';

import { getUserAgentInfo } from './userAgent.js';

/*
 * Depends on browser's implementation of global fetch.
 */
class WebFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return fetch.bind(globalThis);
  }
}

export class WebRemote extends AbstractRemote {
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

  getUserAgent(): string {
    let ua = [super.getUserAgent(), `powersync-web`];
    try {
      ua.push(...getUserAgentInfo());
    } catch (e) {
      this.logger.warn('Failed to get user agent info', e);
    }
    return ua.join(' ');
  }
}
