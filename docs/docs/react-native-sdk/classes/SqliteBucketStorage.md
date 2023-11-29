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
| `logger?` | `ILogger` |

#### Returns

[`SqliteBucketStorage`](SqliteBucketStorage.md)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:19

## Properties

### \_hasCompletedSync

• `Private` **\_hasCompletedSync**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:14

___

### clearRemoveOps

• `Private` **clearRemoveOps**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:50

___

### compactCounter

• `Private` **compactCounter**: `any`

Count up, and do a compact on startup.

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:18

___

### db

• `Private` **db**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:8

___

### deleteBucket

• `Private` **deleteBucket**: `any`

Mark a bucket for deletion.

**`Param`**

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:34

___

### deletePendingBuckets

• `Private` **deletePendingBuckets**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:49

___

### logger

• `Private` **logger**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:10

___

### mutex

• `Private` **mutex**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:9

___

### pendingBucketDeletes

• `Private` **pendingBucketDeletes**: `any`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:13

___

### tableNames

• **tableNames**: `Set`<`string`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:12

___

### updateObjectsFromBuckets

• `Private` **updateObjectsFromBuckets**: `any`

Atomically update the local state to the current checkpoint.

This includes creating new tables, dropping old tables, and copying data over from the oplog.

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:42

___

### MAX\_OP\_ID

▪ `Static` **MAX\_OP\_ID**: `string`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:11

## Methods

### autoCompact

▸ **autoCompact**(): `Promise`<`void`\>

Exposed for tests only.

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[autoCompact](../interfaces/BucketStorageAdapter.md#autocompact)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:48

___

### forceCompact

▸ **forceCompact**(): `Promise`<`void`\>

Force a compact, for tests.

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[forceCompact](../interfaces/BucketStorageAdapter.md#forcecompact)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:47

___

### getBucketStates

▸ **getBucketStates**(): `Promise`<[`BucketState`](../interfaces/BucketState.md)[]\>

#### Returns

`Promise`<[`BucketState`](../interfaces/BucketState.md)[]\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[getBucketStates](../interfaces/BucketStorageAdapter.md#getbucketstates)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:26

___

### getCrudBatch

▸ **getCrudBatch**(`limit?`): `Promise`<[`CrudBatch`](CrudBatch.md)\>

Get a batch of objects to send to the server.
When the objects are successfully sent to the server, call .complete()

#### Parameters

| Name | Type |
| :------ | :------ |
| `limit?` | `number` |

#### Returns

`Promise`<[`CrudBatch`](CrudBatch.md)\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[getCrudBatch](../interfaces/BucketStorageAdapter.md#getcrudbatch)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:57

___

### getMaxOpId

▸ **getMaxOpId**(): `string`

#### Returns

`string`

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[getMaxOpId](../interfaces/BucketStorageAdapter.md#getmaxopid)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:21

___

### hasCompletedSync

▸ **hasCompletedSync**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[hasCompletedSync](../interfaces/BucketStorageAdapter.md#hascompletedsync)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:35

___

### hasCrud

▸ **hasCrud**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[hasCrud](../interfaces/BucketStorageAdapter.md#hascrud)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:52

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[init](../interfaces/BucketStorageAdapter.md#init)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:20

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

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:28

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

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:27

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

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:64

___

### startSession

▸ **startSession**(): `void`

Reset any caches.

#### Returns

`void`

#### Implementation of

[BucketStorageAdapter](../interfaces/BucketStorageAdapter.md).[startSession](../interfaces/BucketStorageAdapter.md#startsession)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:25

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

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:36

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

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:51

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

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:43

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

powersync-sdk-common/lib/client/sync/bucket/SqliteBucketStorage.d.ts:58
