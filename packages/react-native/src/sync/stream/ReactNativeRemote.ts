import {
  AbstractRemote,
  BSONImplementation,
  DataStream,
  StreamingSyncLine,
  SyncStreamOptions
} from '@powersync/common';
import { Platform } from 'react-native';
// Note docs for React Native https://github.com/mongodb/js-bson?tab=readme-ov-file#react-native
import { BSON } from 'bson';
export const STREAMING_POST_TIMEOUT_MS = 30_000;

type PolyfillTest = {
  test: () => boolean;
  name: string;
};

const CommonPolyfills: PolyfillTest[] = [
  // {
  //   name: 'TextEncoder',
  //   test: () => typeof TextEncoder == 'undefined'
  // }
];

const SocketPolyfillTests: PolyfillTest[] = [
  ...CommonPolyfills
  // {
  //   name: 'nextTick',
  //   test: () => typeof process.nextTick == 'undefined'
  // },
  // {
  //   name: 'Buffer',
  //   test: () => typeof global.Buffer == 'undefined'
  // }
];

const HttpPolyfillTests: PolyfillTest[] = [
  ...CommonPolyfills
  // {
  //   name: 'TextDecoder',
  //   test: () => typeof TextDecoder == 'undefined'
  // },
  // {
  //   name: 'ReadableStream',
  //   test: () => typeof ReadableStream == 'undefined'
  // }
];

const validatePolyfills = (tests: PolyfillTest[]) => {
  const missingPolyfills = tests.filter((t) => t.test()).map((t) => t.name);
  if (missingPolyfills.length) {
    throw new Error(
      `
Polyfills are undefined. Please ensure React Native polyfills are installed and imported in the app entrypoint.
See package README for detailed instructions.
The following polyfills appear to be missing:
${missingPolyfills.join('\n')}`
    );
  }
};

export class ReactNativeRemote extends AbstractRemote {
  async getBSON(): Promise<BSONImplementation> {
    return BSON;
  }

  async socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    validatePolyfills(SocketPolyfillTests);
    return super.socketStream(options);
  }

  async postStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    validatePolyfills(HttpPolyfillTests);

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
