import { LogLevels, PowerSyncLogger } from '@powersync/common';
import { AbstractRemote, FetchOptions, RemoteConnector } from '@powersync/shared-internals';
import { Platform } from 'react-native';
// @ts-expect-error
import { TextDecoder } from 'text-encoding';

// @ts-expect-error
import { fetch } from 'react-native-fetch-api';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

export class ReactNativeRemote extends AbstractRemote {
  constructor(
    protected connector: RemoteConnector,
    logger: PowerSyncLogger
  ) {
    super(connector, logger);
  }

  protected async fetch(options: FetchOptions): Promise<Response> {
    let timeout: unknown;
    if (options.expectStreamingResponse) {
      // @ts-expect-error https://github.com/react-native-community/fetch#enable-text-streaming
      options.request.reactNative = {
        /**
         * The `react-native-fetch-api` polyfill provides streaming support via
         * this non-standard flag
         * https://github.com/react-native-community/fetch#enable-text-streaming
         */
        textStreaming: true
      };

      timeout =
        Platform.OS == 'android'
          ? setTimeout(() => {
              this.logger.log({
                level: LogLevels.warn,
                message: `HTTP Streaming POST is taking longer than ${Math.ceil(
                  STREAMING_POST_TIMEOUT_MS / 1000
                )} seconds to resolve. If using a debug build, please ensure Flipper Network plugin is disabled.`
              });
            }, STREAMING_POST_TIMEOUT_MS)
          : null;
    }

    try {
      // Directly import the fetch implementation from react-native-fetch-api. This removes the requirement for the
      // global `fetch` to be overridden by a polyfill.
      return await fetch(options.resource, options.request);
    } finally {
      clearTimeout(timeout as any);
    }
  }

  getUserAgent(): string {
    return [
      super.getUserAgent(),
      `powersync-react-native`,
      `react-native/${Platform.constants.reactNativeVersion.major}.${Platform.constants.reactNativeVersion.minor}`,
      `${Platform.OS}/${Platform.Version}`
    ].join(' ');
  }

  createTextDecoder(): TextDecoder {
    return new TextDecoder();
  }

  protected get supportsStreamingBinaryResponses(): boolean {
    // We have to pass textStreaming: true to get streamed responses at all, and those don't support binary data.
    return false;
  }
}
