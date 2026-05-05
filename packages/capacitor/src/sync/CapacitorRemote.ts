import { AbstractRemoteOptions, DEFAULT_REMOTE_LOGGER, ILogger, RemoteConnector, WebRemote } from '@powersync/web';

export interface CapacitorRemoteOptions extends AbstractRemoteOptions {
  /**
   * An optional override to specify if binary streaming should be used.
   */
  supportsStreamingBinaryResponses: boolean;
}

export class CapacitorRemote extends WebRemote {
  protected _supportsStreamingBinaryResponses: boolean | null;

  constructor(
    connector: RemoteConnector,
    logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<CapacitorRemoteOptions>
  ) {
    super(connector, logger, options);
    this._supportsStreamingBinaryResponses = options?.supportsStreamingBinaryResponses ?? null;
  }

  protected get supportsStreamingBinaryResponses(): boolean {
    return this._supportsStreamingBinaryResponses ?? super.supportsStreamingBinaryResponses;
  }
}
