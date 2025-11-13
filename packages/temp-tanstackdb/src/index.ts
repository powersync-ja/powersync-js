import type { StandardSchemaV1 } from '@standard-schema/spec';
import { BaseCollectionConfig, CollectionConfig, SyncConfig } from '@tanstack/db';

export type BasePowerSyncCollectionConfig<
  TTable extends Record<string, unknown>,
  TSchema extends StandardSchemaV1 = never
> = Omit<BaseCollectionConfig<TTable, string, TSchema>, `onInsert` | `onUpdate` | `onDelete` | `getKey`> & {};

export function powerSyncCollectionOptions<
  TTable extends Record<string, unknown>,
  TSchema extends StandardSchemaV1<any> = never
>(config: BasePowerSyncCollectionConfig<TTable, TSchema>) {
  const { ...restConfig } = config;

  const sync: SyncConfig<TTable, string> = {
    sync: (params) => {
      const { begin, write, commit, markReady } = params;
      const abortController = new AbortController();

      // The sync function needs to be synchronous
      async function start() {}

      start().catch((error) => console.error(`Could not start syncing process for TODO into TODO`, error));

      return () => {
        console.info(`Sync has been stopped for TODO into TODO`);
        abortController.abort();
      };
    }
  };

  const getKey = (record: TTable) => {
    if ('id' in record) {
      return record.id as string;
    }
    throw new Error('Record has no id');
  };

  const outputConfig: CollectionConfig<TTable, string, TSchema> = {
    ...restConfig,
    getKey,
    // Syncing should start immediately since we need to monitor the changes for mutations
    startSync: true,
    sync,
    onInsert: async (params) => {},
    onUpdate: async (params) => {},
    onDelete: async (params) => {},
    utils: {}
  };
  return outputConfig;
}
