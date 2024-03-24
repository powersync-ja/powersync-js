import { AbstractRemote, DataStream, StreamingSyncLine, SyncStreamOptions } from '@journeyapps/powersync-sdk-common';
import { Platform } from 'react-native';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

/**
 * Required for cross-fetch
 */
process.nextTick = setImmediate;

export class ReactNativeRemote extends AbstractRemote {
  socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    throw new Error('Method not implemented.');
  }

  async postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    // Ensure polyfills are present
    if (
      typeof ReadableStream == 'undefined' ||
      typeof TextEncoder == 'undefined' ||
      typeof TextDecoder == 'undefined'
    ) {
      const errorMessage = `Polyfills are undefined. Please ensure React Native polyfills are installed and imported in the app entrypoint.
      "import 'react-native-polyfill-globals/auto';"
      `;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

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

    const result = await super.postStream({
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

    if (timeout) {
      clearTimeout(timeout);
    }
    return result;
  }
}
