import { LogLevels, PowerSyncLogger } from '@powersync/common';
import { AbstractRemote, FetchOptions, RemoteConnector } from '@powersync/shared-internals';

import { getUserAgentInfo } from './userAgent.js';
import type { WebSocketSyncStreamPlatform, WebSocketSupport } from '@powersync/shared-internals/websockets';

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

  protected async loadWebSocketSupport(platform: WebSocketSyncStreamPlatform): Promise<WebSocketSupport> {
    if (!websockets) {
      websockets = import('@powersync/shared-internals/websockets').then(
        (module) => new module.WebSocketSupport(platform)
      );
    }

    return await websockets;
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

let websockets: Promise<WebSocketSupport> | undefined;
