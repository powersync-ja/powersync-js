import { LogLevels, PowerSyncLogger } from '@powersync/common';
import { AbstractRemote, FetchOptions, RemoteConnector } from '@powersync/shared-internals';
import { Platform } from 'react-native';
import { WebSocketSupport, WebSocketSyncStreamPlatform } from '@powersync/shared-internals/websockets';

export const STREAMING_POST_TIMEOUT_MS = 30_000;

export interface ReactNativeRemoteOptions {
  fetchImplementation?: typeof fetch;
}

export class ReactNativeRemote extends AbstractRemote {
  constructor(
    protected connector: RemoteConnector,
    logger: PowerSyncLogger,
    readonly options?: ReactNativeRemoteOptions
  ) {
    super(connector, logger);
  }

  protected async fetch(options: FetchOptions): Promise<Response> {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const { resource, request, expectStreamingResponse } = options;
    if (expectStreamingResponse) {
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
      if (this.options?.fetchImplementation) {
        this.options.fetchImplementation(resource, request);
      }

      const defaultImpl = resolveDefaultFetchImplementation();
      if (expectStreamingResponse && !defaultImpl.supportsStreams) {
        // We can't fall back to the default fetch() implementation since we need a response stream.
        const errorMessage =
          'The PowerSync SDK requires a fetch() implementation capable of streaming responses, which React Native ' +
          'does not support that natively. ' +
          'Neither `expo/fetch` nor `react-native-fetch-api` could be resolved though. Try adding dependencies or ' +
          'use `SyncStreamConnectionMethod.WEB_SOCKET` on your connect() call.';
        throw new Error(errorMessage);
      }

      return defaultImpl.run(options);
    } finally {
      if (timeout != null) clearTimeout(timeout);
    }
  }

  protected loadWebSocketSupport(platform: WebSocketSyncStreamPlatform): Promise<WebSocketSupport> {
    return Promise.resolve((websockets ??= new WebSocketSupport(platform)));
  }

  getUserAgent(): string {
    return [
      super.getUserAgent(),
      `powersync-react-native`,
      `react-native/${Platform.constants.reactNativeVersion.major}.${Platform.constants.reactNativeVersion.minor}`,
      `${Platform.OS}/${Platform.Version}`
    ].join(' ');
  }

  protected get supportsStreamingBinaryResponses(): boolean {
    return resolveDefaultFetchImplementation().supportsStreamingBinaryResponses;
  }
}

interface FetchImplementation {
  readonly supportsStreams: boolean;
  readonly supportsStreamingBinaryResponses: boolean;

  run(options: FetchOptions): Promise<Response>;
}

let defaultFetchImplementation: FetchImplementation | undefined;

function resolveDefaultFetchImplementation(): FetchImplementation {
  if (defaultFetchImplementation) {
    return defaultFetchImplementation;
  }

  try {
    const { fetch } = require('expo/fetch');
    return {
      supportsStreams: true,
      supportsStreamingBinaryResponses: true,
      run({ resource, request }) {
        return fetch(resource, request);
      }
    };
  } catch (expoNotFound) {
    try {
      // Directly import the fetch implementation from react-native-fetch-api. This removes the requirement for the
      // global `fetch` to be overridden by a polyfill.
      const { fetch } = require('react-native-fetch-api');
      return {
        supportsStreams: true,
        // We have to pass textStreaming: true to get streamed responses at all, and those don't support binary data.
        supportsStreamingBinaryResponses: false,
        run({ resource, request, expectStreamingResponse }) {
          if (expectStreamingResponse) {
            // @ts-expect-error https://github.com/react-native-community/fetch#enable-text-streaming
            options.request.reactNative = {
              /**
               * The `react-native-fetch-api` polyfill provides streaming support via
               * this non-standard flag
               * https://github.com/react-native-community/fetch#enable-text-streaming
               */
              textStreaming: true
            };
          }

          return fetch(resource, request);
        }
      };
    } catch (legacyNotFound) {
      // Fetch polyfill built in to React Native. This one doesn't support streaming responses.
      return {
        supportsStreams: false,
        supportsStreamingBinaryResponses: false,
        run({ resource, request }) {
          return fetch(resource, request);
        }
      };
    }
  }
}

let websockets: WebSocketSupport | undefined;
