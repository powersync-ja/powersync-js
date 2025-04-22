import * as os from 'node:os';

import {
  type ILogger,
  AbstractRemote,
  AbstractRemoteOptions,
  BSONImplementation,
  DEFAULT_REMOTE_LOGGER,
  FetchImplementation,
  FetchImplementationProvider,
  RemoteConnector
} from '@powersync/common';
import { BSON } from 'bson';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

class NodeFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return fetch.bind(globalThis);
  }
}

export class NodeRemote extends AbstractRemote {
  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    super(connector, logger, {
      ...(options ?? {}),
      fetchImplementation: options?.fetchImplementation ?? new NodeFetchProvider()
    });
  }

  getUserAgent(): string {
    return [
      super.getUserAgent(),
      `powersync-node`,
      `node/${process.versions.node}`,
      `${os.platform()}/${os.release()}`
    ].join(' ');
  }

  async getBSON(): Promise<BSONImplementation> {
    return BSON;
  }
}
