---
id: "SqliteBucketStorage"
title: "Class: SqliteBucketStorage"
sidebar_label: "SqliteBucketStorage"
sidebar_position: 0
custom_edit_url: null
---

## Implements

- [`BucketStorageAdapter`](../interfaces/BucketStorageAdapter.md)

## Constructors

### constructor

• **new SqliteBucketStorage**(`db`, `mutex`, `logger?`): [`SqliteBucketStorage`](SqliteBucketStorage.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `db` | [`DBAdapter`](../interfaces/DBAdapter.md) |
| `mutex` | `Mutex` |
| `logger` | `ILogger` |

#### Returns

[`SqliteBucketStorage`](SqliteBucketStorage.md)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:25](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L25)

## Properties

### \_hasCompletedSync

• `Private` **\_hasCompletedSync**: `boolean`

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L18)

___

### compactCounter

• `Private` **compactCounter**: `number` = `COMPACT_OPERATION_INTERVAL`

Count up, and do a compact on startup.

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:23](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L23)

___

### db

• `Private` **db**: [`DBAdapter`](../interfaces/DBAdapter.md)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:26](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L26)

___

### logger

• `Private` **logger**: `ILogger`

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:28](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L28)

___

### mutex

• `Private` **mutex**: `Mutex`

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:27](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L27)

___

### pendingBucketDeletes

• `Private` **pendingBucketDeletes**: `boolean`

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:17](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L17)

___

### tableNames

• **tableNames**: `Set`<`string`\>

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:16](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L16)

___

### MAX\_OP\_ID

▪ `Static` **MAX\_OP\_ID**: `string` = `'9223372036854775807'`

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:14](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L14)

## Methods

### autoCompact

▸ **autoCompact**(): `Promise`<`void`\>

Exposed for tests only.

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[autoCompact](../interfaces/BucketStorageAdapter.md#autocompact)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:210](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L210)

___

### clearRemoveOps

▸ **clearRemoveOps**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:230](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L230)

___

### deleteBucket

▸ **deleteBucket**(`bucket`): `Promise`<`void`\>

Mark a bucket for deletion.

#### Parameters

| Name | Type |
| :------ | :------ |
| `bucket` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:86](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L86)

___

### deletePendingBuckets

▸ **deletePendingBuckets**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:215](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L215)

___

### forceCompact

▸ **forceCompact**(): `Promise`<`void`\>

Force a compact, for tests.

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[forceCompact](../interfaces/BucketStorageAdapter.md#forcecompact)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:203](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L203)

___

### getBucketStates

▸ **getBucketStates**(): `Promise`<[`BucketState`](../interfaces/BucketState.md)[]\>

#### Returns

`Promise`<[`BucketState`](../interfaces/BucketState.md)[]\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[getBucketStates](../interfaces/BucketStorageAdapter.md#getbucketstates)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:53](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L53)

___

### getCrudBatch

▸ **getCrudBatch**(`limit?`): `Promise`<[`CrudBatch`](CrudBatch.md)\>

Get a batch of objects to send to the server.
When the objects are successfully sent to the server, call .complete()

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `limit` | `number` | `100` |

#### Returns

`Promise`<[`CrudBatch`](CrudBatch.md)\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[getCrudBatch](../interfaces/BucketStorageAdapter.md#getcrudbatch)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:297](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L297)

___

### getMaxOpId

▸ **getMaxOpId**(): `string`

#### Returns

`string`

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[getMaxOpId](../interfaces/BucketStorageAdapter.md#getmaxopid)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:45](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L45)

___

### hasCompletedSync

▸ **hasCompletedSync**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[hasCompletedSync](../interfaces/BucketStorageAdapter.md#hascompletedsync)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:111](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L111)

___

### hasCrud

▸ **hasCrud**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[hasCrud](../interfaces/BucketStorageAdapter.md#hascrud)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:288](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L288)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[init](../interfaces/BucketStorageAdapter.md#init)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:35](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L35)

___

### removeBuckets

▸ **removeBuckets**(`buckets`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `buckets` | `string`[] |

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[removeBuckets](../interfaces/BucketStorageAdapter.md#removebuckets)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:75](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L75)

___

### saveSyncData

▸ **saveSyncData**(`batch`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `batch` | [`SyncDataBatch`](SyncDataBatch.md) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[saveSyncData](../interfaces/BucketStorageAdapter.md#savesyncdata)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:60](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L60)

___

### setTargetCheckpoint

▸ **setTargetCheckpoint**(`checkpoint`): `Promise`<`void`\>

Set a target checkpoint.

#### Parameters

| Name | Type |
| :------ | :------ |
| `checkpoint` | [`Checkpoint`](../interfaces/Checkpoint.md) |

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[setTargetCheckpoint](../interfaces/BucketStorageAdapter.md#settargetcheckpoint)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:340](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L340)

___

### startSession

▸ **startSession**(): `void`

Reset any caches.

#### Returns

`void`

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[startSession](../interfaces/BucketStorageAdapter.md#startsession)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:51](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L51)

___

### syncLocalDatabase

▸ **syncLocalDatabase**(`checkpoint`): `Promise`<[`SyncLocalDatabaseResult`](../interfaces/SyncLocalDatabaseResult.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `checkpoint` | [`Checkpoint`](../interfaces/Checkpoint.md) |

#### Returns

`Promise`<[`SyncLocalDatabaseResult`](../interfaces/SyncLocalDatabaseResult.md)\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[syncLocalDatabase](../interfaces/BucketStorageAdapter.md#synclocaldatabase)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:123](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L123)

___

### updateLocalTarget

▸ **updateLocalTarget**(`cb`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | () => `Promise`<`string`\> |

#### Returns

`Promise`<`boolean`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[updateLocalTarget](../interfaces/BucketStorageAdapter.md#updatelocaltarget)

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:241](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L241)

___

### updateObjectsFromBuckets

▸ **updateObjectsFromBuckets**(`checkpoint`): `Promise`<`boolean`\>

Atomically update the local state to the current checkpoint.

This includes creating new tables, dropping old tables, and copying data over from the oplog.

#### Parameters

| Name | Type |
| :------ | :------ |
| `checkpoint` | [`Checkpoint`](../interfaces/Checkpoint.md) |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:164](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L164)

___

### validateChecksums

▸ **validateChecksums**(`checkpoint`): `Promise`<[`SyncLocalDatabaseResult`](../interfaces/SyncLocalDatabaseResult.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `checkpoint` | [`Checkpoint`](../interfaces/Checkpoint.md) |

#### Returns

`Promise`<[`SyncLocalDatabaseResult`](../interfaces/SyncLocalDatabaseResult.md)\>

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:174](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L174)

___

### writeTransaction

▸ **writeTransaction**<`T`\>(`callback`, `options?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`tx`: [`Transaction`](../interfaces/Transaction.md)) => `Promise`<`T`\> |
| `options?` | `Object` |
| `options.timeoutMs` | `number` |

#### Returns

`Promise`<`T`\>

#### Defined in

[client/sync/bucket/SqliteBucketStorage.ts:333](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SqliteBucketStorage.ts#L333)
