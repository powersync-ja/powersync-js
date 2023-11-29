---
id: "modules"
title: "@journeyapps/powersync-sdk-common"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---

## Enumerations

- [ColumnType](enums/ColumnType.md)
- [LockType](enums/LockType.md)
- [OpTypeEnum](enums/OpTypeEnum.md)
- [RowUpdateType](enums/RowUpdateType.md)
- [UpdateType](enums/UpdateType.md)

## Classes

- [AbstractPowerSyncDatabase](classes/AbstractPowerSyncDatabase.md)
- [AbstractPowerSyncDatabaseOpenFactory](classes/AbstractPowerSyncDatabaseOpenFactory.md)
- [AbstractRemote](classes/AbstractRemote.md)
- [AbstractStreamingSyncImplementation](classes/AbstractStreamingSyncImplementation.md)
- [BaseObserver](classes/BaseObserver.md)
- [Column](classes/Column.md)
- [CrudBatch](classes/CrudBatch.md)
- [CrudEntry](classes/CrudEntry.md)
- [CrudTransaction](classes/CrudTransaction.md)
- [Index](classes/Index.md)
- [IndexedColumn](classes/IndexedColumn.md)
- [OpType](classes/OpType.md)
- [Schema](classes/Schema.md)
- [SqliteBucketStorage](classes/SqliteBucketStorage.md)
- [SyncDataBatch](classes/SyncDataBatch.md)
- [SyncDataBucket](classes/SyncDataBucket.md)
- [SyncStatus](classes/SyncStatus.md)
- [Table](classes/Table.md)
- [UploadQueueStats](classes/UploadQueueStats.md)

## Interfaces

- [AbstractStreamingSyncImplementationOptions](interfaces/AbstractStreamingSyncImplementationOptions.md)
- [BaseObserverInterface](interfaces/BaseObserverInterface.md)
- [BucketChecksum](interfaces/BucketChecksum.md)
- [BucketRequest](interfaces/BucketRequest.md)
- [BucketState](interfaces/BucketState.md)
- [BucketStorageAdapter](interfaces/BucketStorageAdapter.md)
- [Checkpoint](interfaces/Checkpoint.md)
- [ChecksumCache](interfaces/ChecksumCache.md)
- [ColumnOptions](interfaces/ColumnOptions.md)
- [ContinueCheckpointRequest](interfaces/ContinueCheckpointRequest.md)
- [CrudRequest](interfaces/CrudRequest.md)
- [CrudResponse](interfaces/CrudResponse.md)
- [DBAdapter](interfaces/DBAdapter.md)
- [DBAdapterListener](interfaces/DBAdapterListener.md)
- [DBGetUtils](interfaces/DBGetUtils.md)
- [DBLockOptions](interfaces/DBLockOptions.md)
- [IndexColumnOptions](interfaces/IndexColumnOptions.md)
- [IndexOptions](interfaces/IndexOptions.md)
- [LockContext](interfaces/LockContext.md)
- [LockOptions](interfaces/LockOptions.md)
- [PowerSyncBackendConnector](interfaces/PowerSyncBackendConnector.md)
- [PowerSyncCredentials](interfaces/PowerSyncCredentials.md)
- [PowerSyncDBListener](interfaces/PowerSyncDBListener.md)
- [PowerSyncDatabaseOptions](interfaces/PowerSyncDatabaseOptions.md)
- [PowerSyncOpenFactoryOptions](interfaces/PowerSyncOpenFactoryOptions.md)
- [QueryResult](interfaces/QueryResult.md)
- [SQLWatchOptions](interfaces/SQLWatchOptions.md)
- [StreamingSyncCheckpoint](interfaces/StreamingSyncCheckpoint.md)
- [StreamingSyncCheckpointComplete](interfaces/StreamingSyncCheckpointComplete.md)
- [StreamingSyncCheckpointDiff](interfaces/StreamingSyncCheckpointDiff.md)
- [StreamingSyncDataJSON](interfaces/StreamingSyncDataJSON.md)
- [StreamingSyncImplementationListener](interfaces/StreamingSyncImplementationListener.md)
- [StreamingSyncKeepalive](interfaces/StreamingSyncKeepalive.md)
- [StreamingSyncRequest](interfaces/StreamingSyncRequest.md)
- [SyncLocalDatabaseResult](interfaces/SyncLocalDatabaseResult.md)
- [SyncNewCheckpointRequest](interfaces/SyncNewCheckpointRequest.md)
- [SyncResponse](interfaces/SyncResponse.md)
- [TableOptions](interfaces/TableOptions.md)
- [Transaction](interfaces/Transaction.md)
- [UpdateNotification](interfaces/UpdateNotification.md)
- [WatchOnChangeEvent](interfaces/WatchOnChangeEvent.md)

## Type Aliases

### BaseListener

Ƭ **BaseListener**: `Object`

#### Index signature

▪ [key: `string`]: (...`event`: `any`) => `any`

#### Defined in

[utils/BaseObserver.ts:7](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L7)

___

### CrudEntryDataJSON

Ƭ **CrudEntryDataJSON**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `data` | `Record`<`string`, `any`\> |
| `id` | `string` |
| `op` | [`UpdateType`](enums/UpdateType.md) |
| `type` | `string` |

#### Defined in

[client/sync/bucket/CrudEntry.ts:22](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L22)

___

### CrudEntryJSON

Ƭ **CrudEntryJSON**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `data` | `string` |
| `id` | `string` |
| `tx_id?` | `number` |

#### Defined in

[client/sync/bucket/CrudEntry.ts:16](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L16)

___

### CrudEntryOutputJSON

Ƭ **CrudEntryOutputJSON**: `Object`

The output JSOn seems to be a third type of JSON, not the same as the input JSON.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `data` | `Record`<`string`, `any`\> |
| `id` | `string` |
| `op` | [`UpdateType`](enums/UpdateType.md) |
| `op_id` | `number` |
| `tx_id?` | `number` |
| `type` | `string` |

#### Defined in

[client/sync/bucket/CrudEntry.ts:32](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L32)

___

### OpId

Ƭ **OpId**: `string`

64-bit unsigned integer stored as a string in base-10.

Not sortable as a string.

#### Defined in

[client/sync/bucket/CrudEntry.ts:8](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L8)

___

### OpTypeJSON

Ƭ **OpTypeJSON**: `string`

#### Defined in

[client/sync/bucket/OpType.ts:8](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/OpType.ts#L8)

___

### RemoteConnector

Ƭ **RemoteConnector**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `fetchCredentials` | () => `Promise`<[`PowerSyncCredentials`](interfaces/PowerSyncCredentials.md)\> |

#### Defined in

[client/sync/stream/AbstractRemote.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L4)

___

### StreamingSyncLine

Ƭ **StreamingSyncLine**: [`StreamingSyncDataJSON`](interfaces/StreamingSyncDataJSON.md) \| [`StreamingSyncCheckpoint`](interfaces/StreamingSyncCheckpoint.md) \| [`StreamingSyncCheckpointDiff`](interfaces/StreamingSyncCheckpointDiff.md) \| [`StreamingSyncCheckpointComplete`](interfaces/StreamingSyncCheckpointComplete.md) \| [`StreamingSyncKeepalive`](interfaces/StreamingSyncKeepalive.md)

#### Defined in

[client/sync/stream/streaming-sync-types.ts:108](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L108)

___

### SyncDataBucketJSON

Ƭ **SyncDataBucketJSON**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `after?` | `string` |
| `bucket` | `string` |
| `data` | `OplogEntryJSON`[] |
| `has_more?` | `boolean` |
| `next_after?` | `string` |

#### Defined in

[client/sync/bucket/SyncDataBucket.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L4)

___

### SyncRequest

Ƭ **SyncRequest**: [`ContinueCheckpointRequest`](interfaces/ContinueCheckpointRequest.md) \| [`SyncNewCheckpointRequest`](interfaces/SyncNewCheckpointRequest.md)

#### Defined in

[client/sync/stream/streaming-sync-types.ts:40](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L40)

## Variables

### DEFAULT\_INDEX\_COLUMN\_OPTIONS

• `Const` **DEFAULT\_INDEX\_COLUMN\_OPTIONS**: `Partial`<[`IndexColumnOptions`](interfaces/IndexColumnOptions.md)\>

#### Defined in

[db/schema/IndexedColumn.ts:9](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/IndexedColumn.ts#L9)

___

### DEFAULT\_INDEX\_OPTIONS

• `Const` **DEFAULT\_INDEX\_OPTIONS**: `Partial`<[`IndexOptions`](interfaces/IndexOptions.md)\>

#### Defined in

[db/schema/Index.ts:9](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Index.ts#L9)

___

### DEFAULT\_LOCK\_TIMEOUT\_MS

• `Const` **DEFAULT\_LOCK\_TIMEOUT\_MS**: ``120000``

Requesting nested or recursive locks can block the application in some circumstances.
This default lock timeout will act as a failsafe to throw an error if a lock cannot
be obtained.

#### Defined in

[client/AbstractPowerSyncDatabase.ts:56](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L56)

___

### DEFAULT\_POWERSYNC\_DB\_OPTIONS

• `Const` **DEFAULT\_POWERSYNC\_DB\_OPTIONS**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `logger` | `ILogger` |
| `retryDelay` | `number` |

#### Defined in

[client/AbstractPowerSyncDatabase.ts:46](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L46)

___

### DEFAULT\_REMOTE\_LOGGER

• `Const` **DEFAULT\_REMOTE\_LOGGER**: `ILogger`

#### Defined in

[client/sync/stream/AbstractRemote.ts:11](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractRemote.ts#L11)

___

### DEFAULT\_STREAMING\_SYNC\_OPTIONS

• `Const` **DEFAULT\_STREAMING\_SYNC\_OPTIONS**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `logger` | `ILogger` |
| `retryDelayMs` | `number` |

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:46](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L46)

___

### DEFAULT\_TABLE\_OPTIONS

• `Const` **DEFAULT\_TABLE\_OPTIONS**: `Partial`<[`TableOptions`](interfaces/TableOptions.md)\>

#### Defined in

[db/schema/Table.ts:12](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L12)

___

### DEFAULT\_WATCH\_THROTTLE\_MS

• `Const` **DEFAULT\_WATCH\_THROTTLE\_MS**: ``30``

#### Defined in

[client/AbstractPowerSyncDatabase.ts:44](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L44)

___

### MAX\_OP\_ID

• `Const` **MAX\_OP\_ID**: ``"9223372036854775807"``

#### Defined in

[client/sync/bucket/SyncDataBucket.ts:12](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L12)

## Functions

### isContinueCheckpointRequest

▸ **isContinueCheckpointRequest**(`request`): request is ContinueCheckpointRequest

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SyncRequest`](modules.md#syncrequest) |

#### Returns

request is ContinueCheckpointRequest

#### Defined in

[client/sync/stream/streaming-sync-types.ts:144](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L144)

___

### isStreamingKeepalive

▸ **isStreamingKeepalive**(`line`): line is StreamingSyncKeepalive

#### Parameters

| Name | Type |
| :------ | :------ |
| `line` | [`StreamingSyncLine`](modules.md#streamingsyncline) |

#### Returns

line is StreamingSyncKeepalive

#### Defined in

[client/sync/stream/streaming-sync-types.ts:128](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L128)

___

### isStreamingSyncCheckpoint

▸ **isStreamingSyncCheckpoint**(`line`): line is StreamingSyncCheckpoint

#### Parameters

| Name | Type |
| :------ | :------ |
| `line` | [`StreamingSyncLine`](modules.md#streamingsyncline) |

#### Returns

line is StreamingSyncCheckpoint

#### Defined in

[client/sync/stream/streaming-sync-types.ts:132](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L132)

___

### isStreamingSyncCheckpointComplete

▸ **isStreamingSyncCheckpointComplete**(`line`): line is StreamingSyncCheckpointComplete

#### Parameters

| Name | Type |
| :------ | :------ |
| `line` | [`StreamingSyncLine`](modules.md#streamingsyncline) |

#### Returns

line is StreamingSyncCheckpointComplete

#### Defined in

[client/sync/stream/streaming-sync-types.ts:136](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L136)

___

### isStreamingSyncCheckpointDiff

▸ **isStreamingSyncCheckpointDiff**(`line`): line is StreamingSyncCheckpointDiff

#### Parameters

| Name | Type |
| :------ | :------ |
| `line` | [`StreamingSyncLine`](modules.md#streamingsyncline) |

#### Returns

line is StreamingSyncCheckpointDiff

#### Defined in

[client/sync/stream/streaming-sync-types.ts:140](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L140)

___

### isStreamingSyncData

▸ **isStreamingSyncData**(`line`): line is StreamingSyncDataJSON

#### Parameters

| Name | Type |
| :------ | :------ |
| `line` | [`StreamingSyncLine`](modules.md#streamingsyncline) |

#### Returns

line is StreamingSyncDataJSON

#### Defined in

[client/sync/stream/streaming-sync-types.ts:124](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L124)

___

### isSyncNewCheckpointRequest

▸ **isSyncNewCheckpointRequest**(`request`): request is SyncNewCheckpointRequest

#### Parameters

| Name | Type |
| :------ | :------ |
| `request` | [`SyncRequest`](modules.md#syncrequest) |

#### Returns

request is SyncNewCheckpointRequest

#### Defined in

[client/sync/stream/streaming-sync-types.ts:151](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L151)

___

### quoteJsonPath

▸ **quoteJsonPath**(`path`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`string`

#### Defined in

[utils/strings.ts:5](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/strings.ts#L5)

___

### quoteString

▸ **quoteString**(`s`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `s` | `string` |

#### Returns

`string`

#### Defined in

[utils/strings.ts:1](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/strings.ts#L1)
