import { ILogger } from 'js-logger';

import {
  AbstractRemote,
  AbstractRemoteOptions,
  BSONImplementation,
  DEFAULT_REMOTE_LOGGER,
  DataStream,
  FetchImplementation,
  FetchImplementationProvider,
  RemoteConnector,
  StreamingSyncLine,
  SyncStreamOptions
} from '@powersync/common';
import { Platform } from 'react-native';
// Note docs for React Native https://github.com/mongodb/js-bson?tab=readme-ov-file#react-native
import { BSON } from 'bson';

import { fetch } from 'react-native-fetch-api';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

/**
 * Directly imports fetch implementation from react-native-fetch-api.
 * This removes the requirement for the global `fetch` to be overridden by
 * a polyfill.
 */
class ReactNativeFetchProvider extends FetchImplementationProvider {
  getFetch(): FetchImplementation {
    return fetch.bind(globalThis);
  }
}

export class ReactNativeRemote extends AbstractRemote {
  constructor(
    protected connector: RemoteConnector,
    protected logger: ILogger = DEFAULT_REMOTE_LOGGER,
    options?: Partial<AbstractRemoteOptions>
  ) {
    super(connector, logger, {
      ...(options ?? {}),
      fetchImplementation: options?.fetchImplementation ?? new ReactNativeFetchProvider()
    });
  }

  getUserAgent(): string {
    return [
      super.getUserAgent(),
      `powersync-react-native`,
      `react-native/${Platform.constants.reactNativeVersion.major}.${Platform.constants.reactNativeVersion.minor}`,
      `${Platform.OS}/${Platform.Version}`
    ].join(' ');
  }

  async getBSON(): Promise<BSONImplementation> {
    return BSON;
  }

  async socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    return super.socketStream(options);
  }

  async postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    const timeout =
      Platform.OS == 'android'
        ? setTimeout(() => {
            this.logger.warn(
              `HTTP Streaming POST is taking longer than ${Math.ceil(
                STREAMING_POST_TIMEOUT_MS / 1000
              )} seconds to resolve. If using a debug build, please ensure Flipper Network plugin is disabled.`
            );
          }, STREAMING_POST_TIMEOUT_MS)
        : null;

    try {
      return await super.postStream({
        ...options,
        fetchOptions: {
          ...options.fetchOptions,
          /**
           * The `react-native-fetch-api` polyfill provides streaming support via
           * this non-standard flag
           * https://github.com/react-native-community/fetch#enable-text-streaming
           */
          // @ts-expect-error https://github.com/react-native-community/fetch#enable-text-streaming
          reactNative: { textStreaming: true }
        }
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
