import { LogLevels, PowerSyncLogger } from '@powersync/common';
import { FetchOptions } from '@powersync/shared-internals';

export interface PowerSyncFetchImplementation {
  /**
   * Whether this fetch implementation supports streaming responses.
   *
   * The PowerSync service delivers sync data through a streaming (`Transfer-Encoding: chunked`) response, which is not
   * supported by the default `fetch` polyfill on React Native.
   */
  readonly supportsStreams: boolean;
  run(options: FetchOptions): Promise<Response>;
}

export function defaultFetchImplementation(logger: PowerSyncLogger): PowerSyncFetchImplementation {
  return (resolvedDefault ??= resolveDefaultFetchImplementation(logger));
}

let resolvedDefault: PowerSyncFetchImplementation | undefined;

function resolveDefaultFetchImplementation(logger: PowerSyncLogger): PowerSyncFetchImplementation {
  try {
    const { fetch } = require('expo/fetch');
    return {
      supportsStreams: true,
      run({ resource, request }) {
        return fetch(resource, request);
      }
    };
  } catch (expoNotFound) {
    logger.log({
      level: LogLevels.debug,
      message: 'Could not resolve expo/fetch, HTTP streams are unavailable.',
      error: expoNotFound
    });

    // Fetch polyfill built in to React Native. This one doesn't support streaming responses.
    return {
      supportsStreams: false,
      run({ resource, request }) {
        return fetch(resource, request);
      }
    };
  }
}
