---
id: "modules"
title: "@journeyapps/powersync-sdk-react-native"
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
- [PowerSyncDatabase](classes/PowerSyncDatabase.md)
- [RNQSDBAdapter](classes/RNQSDBAdapter.md)
- [RNQSPowerSyncDatabaseOpenFactory](classes/RNQSPowerSyncDatabaseOpenFactory.md)
- [ReactNativeRemote](classes/ReactNativeRemote.md)
- [ReactNativeStreamingSyncImplementation](classes/ReactNativeStreamingSyncImplementation.md)
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

powersync-sdk-common/lib/utils/BaseObserver.d.ts:4

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

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:17

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

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:12

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

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:26

___

### OpId

Ƭ **OpId**: `string`

64-bit unsigned integer stored as a string in base-10.

Not sortable as a string.

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:6

___

### OpTypeJSON

Ƭ **OpTypeJSON**: `string`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/OpType.d.ts:7

___

### RemoteConnector

Ƭ **RemoteConnector**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `fetchCredentials` | () => `Promise`<[`PowerSyncCredentials`](interfaces/PowerSyncCredentials.md)\> |

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:4

___

### StreamingSyncLine

Ƭ **StreamingSyncLine**: [`StreamingSyncDataJSON`](interfaces/StreamingSyncDataJSON.md) \| [`StreamingSyncCheckpoint`](interfaces/StreamingSyncCheckpoint.md) \| [`StreamingSyncCheckpointDiff`](interfaces/StreamingSyncCheckpointDiff.md) \| [`StreamingSyncCheckpointComplete`](interfaces/StreamingSyncCheckpointComplete.md) \| [`StreamingSyncKeepalive`](interfaces/StreamingSyncKeepalive.md)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:86

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

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:3

___

### SyncRequest

Ƭ **SyncRequest**: [`ContinueCheckpointRequest`](interfaces/ContinueCheckpointRequest.md) \| [`SyncNewCheckpointRequest`](interfaces/SyncNewCheckpointRequest.md)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:32

## Variables

### DEFAULT\_INDEX\_COLUMN\_OPTIONS

• `Const` **DEFAULT\_INDEX\_COLUMN\_OPTIONS**: `Partial`<[`IndexColumnOptions`](interfaces/IndexColumnOptions.md)\>

#### Defined in

powersync-sdk-common/lib/db/schema/IndexedColumn.d.ts:7

___

### DEFAULT\_INDEX\_OPTIONS

• `Const` **DEFAULT\_INDEX\_OPTIONS**: `Partial`<[`IndexOptions`](interfaces/IndexOptions.md)\>

#### Defined in

powersync-sdk-common/lib/db/schema/Index.d.ts:7

___

### DEFAULT\_LOCK\_TIMEOUT\_MS

• `Const` **DEFAULT\_LOCK\_TIMEOUT\_MS**: ``120000``

Requesting nested or recursive locks can block the application in some circumstances.
This default lock timeout will act as a failsafe to throw an error if a lock cannot
be obtained.

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:41

___

### DEFAULT\_POWERSYNC\_DB\_OPTIONS

• `Const` **DEFAULT\_POWERSYNC\_DB\_OPTIONS**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `logger` | `ILogger` |
| `retryDelay` | `number` |

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:32

___

### DEFAULT\_REMOTE\_LOGGER

• `Const` **DEFAULT\_REMOTE\_LOGGER**: `ILogger`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractRemote.d.ts:7

___

### DEFAULT\_STREAMING\_SYNC\_OPTIONS

• `Const` **DEFAULT\_STREAMING\_SYNC\_OPTIONS**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `logger` | `ILogger` |
| `retryDelayMs` | `number` |

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:30

___

### DEFAULT\_TABLE\_OPTIONS

• `Const` **DEFAULT\_TABLE\_OPTIONS**: `Partial`<[`TableOptions`](interfaces/TableOptions.md)\>

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:10

___

### DEFAULT\_WATCH\_THROTTLE\_MS

• `Const` **DEFAULT\_WATCH\_THROTTLE\_MS**: ``30``

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:31

___

### MAX\_OP\_ID

• `Const` **MAX\_OP\_ID**: ``"9223372036854775807"``

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:10

___

### PowerSyncContext

• `Const` **PowerSyncContext**: `React.Context`<[`AbstractPowerSyncDatabase`](classes/AbstractPowerSyncDatabase.md)\>

#### Defined in

powersync-react/lib/hooks/PowerSyncContext.d.ts:3

___

### STREAMING\_POST\_TIMEOUT\_MS

• `Const` **STREAMING\_POST\_TIMEOUT\_MS**: ``30000``

#### Defined in

[powersync-sdk-react-native/src/sync/stream/ReactNativeRemote.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/sync/stream/ReactNativeRemote.ts#L4)

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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:99

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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:95

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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:96

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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:97

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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:98

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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:94

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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:100

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

powersync-sdk-common/lib/utils/strings.d.ts:2

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

powersync-sdk-common/lib/utils/strings.d.ts:1

___

### usePowerSync

▸ **usePowerSync**(): [`AbstractPowerSyncDatabase`](classes/AbstractPowerSyncDatabase.md)

#### Returns

[`AbstractPowerSyncDatabase`](classes/AbstractPowerSyncDatabase.md)

#### Defined in

powersync-react/lib/hooks/PowerSyncContext.d.ts:4

___

### usePowerSyncQuery

▸ **usePowerSyncQuery**<`T`\>(`sqlStatement`, `parameters?`): `T`[]

A hook to access a single static query.
For an updated result, use usePowerSyncWatchedQuery instead

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sqlStatement` | `string` |
| `parameters?` | `any`[] |

#### Returns

`T`[]

#### Defined in

powersync-react/lib/hooks/usePowerSyncQuery.d.ts:5

___

### usePowerSyncWatchedQuery

▸ **usePowerSyncWatchedQuery**<`T`\>(`sqlStatement`, `parameters?`, `options?`): `T`[]

A hook to access the results of a watched query.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `any` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sqlStatement` | `string` |
| `parameters?` | `any`[] |
| `options?` | `Omit`<[`SQLWatchOptions`](interfaces/SQLWatchOptions.md), ``"signal"``\> |

#### Returns

`T`[]

#### Defined in

powersync-react/lib/hooks/usePowerSyncWatchedQuery.d.ts:5
