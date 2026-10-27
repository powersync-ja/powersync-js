import { FetchStrategy, SyncOptions, SyncStreamConnectionMethod } from '@powersync/common';

/**
 * @internal
 */
export type ResolvedSyncOptions = Required<SyncOptions>;

/**
 * @internal
 */
export const DEFAULT_CHECKPOINT_REQUEST_TIMEOUT_MS = 40_000;

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
    crudUploadThrottleMs: options.crudUploadThrottleMs ?? 1000,
    checkpointMode: options.checkpointMode ?? 'legacy',
    checkpointRequestTimeoutMs: options.checkpointRequestTimeoutMs ?? DEFAULT_CHECKPOINT_REQUEST_TIMEOUT_MS,
    diagnostics: options.diagnostics ?? false
  };
}
