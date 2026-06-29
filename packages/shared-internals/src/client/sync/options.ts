import { FetchStrategy, SyncOptions, SyncStreamConnectionMethod } from '@powersync/common';

/**
 * @internal
 */
export type ResolvedSyncOptions = Required<SyncOptions>;

/**
 * @internal
 */
export function resolveSyncOptions(
  options: SyncOptions,
  defaultConnectionMethod: SyncStreamConnectionMethod
): ResolvedSyncOptions {
  return {
    appMetadata: options.appMetadata ?? {},
    connectionMethod: options.connectionMethod ?? defaultConnectionMethod,
    fetchStrategy: options.fetchStrategy ?? FetchStrategy.Buffered,
    params: options.params ?? {},
    includeDefaultStreams: options.includeDefaultStreams ?? true,
    retryDelayMs: options.retryDelayMs ?? 5000,
    crudUploadThrottleMs: options.crudUploadThrottleMs ?? 1000
  };
}
