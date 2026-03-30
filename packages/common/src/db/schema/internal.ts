import { TableOrRawTableOptions } from './Table.js';

/**
 * @internal Not exported from `index.ts`.
 */
export function encodeTableOptions(options: TableOrRawTableOptions) {
  const trackPrevious = options.trackPrevious;

  return {
    local_only: options.localOnly,
    insert_only: options.insertOnly,
    include_old: trackPrevious && ((trackPrevious as any).columns ?? true),
    include_old_only_when_changed: typeof trackPrevious == 'object' && trackPrevious.onlyWhenChanged == true,
    include_metadata: options.trackMetadata,
    ignore_empty_update: options.ignoreEmptyUpdates
  };
}
