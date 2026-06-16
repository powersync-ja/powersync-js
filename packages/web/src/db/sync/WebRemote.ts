import { LogLevels, PowerSyncLogger } from '@powersync/common';
import { AbstractRemote, FetchOptions, RemoteConnector } from '@powersync/shared-internals';

import { getUserAgentInfo } from './userAgent.js';

export class WebRemote extends AbstractRemote {
  constructor(
    protected connector: RemoteConnector,
    logger: PowerSyncLogger
  ) {
    super(connector, logger);
  }

  protected fetch({ resource, request }: FetchOptions): Promise<Response> {
    return fetch(resource, request);
  }

  getUserAgent(): string {
    let ua = [super.getUserAgent(), `powersync-web`];
    try {
      ua.push(...getUserAgentInfo());
    } catch (error) {
      this.logger.log({ level: LogLevels.warn, message: 'Failed to get user agent info', error });
    }
    return ua.join(' ');
  }
}
