import {
  AbstractRemote,
  AbstractRemoteOptions,
  FetchImplementation,
  FetchImplementationProvider,
  LogLevels,
  PowerSyncLogger,
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
    protected logger: PowerSyncLogger,
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
      this.logger.log(LogLevels.warn, 'Failed to get user agent info', e);
    }
    return ua.join(' ');
  }
}
