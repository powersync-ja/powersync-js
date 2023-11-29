---
id: "BucketStorageAdapter"
title: "Interface: BucketStorageAdapter"
sidebar_label: "BucketStorageAdapter"
sidebar_position: 0
custom_edit_url: null
---

## Implemented by

- [`SqliteBucketStorage`](../classes/SqliteBucketStorage.md)

## Methods

### autoCompact

▸ **autoCompact**(): `Promise`<`void`\>

Exposed for tests only.

#### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:55

___

### forceCompact

▸ **forceCompact**(): `Promise`<`void`\>

Exposed for tests only.

#### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:59

___

### getBucketStates

▸ **getBucketStates**(): `Promise`<[`BucketState`](BucketState.md)[]\>

#### Returns

`Promise`<[`BucketState`](BucketState.md)[]\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:42

___

### getCrudBatch

▸ **getCrudBatch**(`limit?`): `Promise`<[`CrudBatch`](../classes/CrudBatch.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `limit?` | `number` |

#### Returns

`Promise`<[`CrudBatch`](../classes/CrudBatch.md)\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:49

___

### getMaxOpId

▸ **getMaxOpId**(): `string`

#### Returns

`string`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:60

___

### hasCompletedSync

▸ **hasCompletedSync**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:50

___

### hasCrud

▸ **hasCrud**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:48

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:37

___

### removeBuckets

▸ **removeBuckets**(`buckets`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `buckets` | `string`[] |

#### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:39

___

### saveSyncData

▸ **saveSyncData**(`batch`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `batch` | [`SyncDataBatch`](../classes/SyncDataBatch.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:38

___

### setTargetCheckpoint

▸ **setTargetCheckpoint**(`checkpoint`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `checkpoint` | [`Checkpoint`](Checkpoint.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:40

___

### startSession

▸ **startSession**(): `void`

#### Returns

`void`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:41

___

### syncLocalDatabase

▸ **syncLocalDatabase**(`checkpoint`): `Promise`<\{ `checkpointValid`: `boolean` ; `failures?`: `any`[] ; `ready`: `boolean`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `checkpoint` | [`Checkpoint`](Checkpoint.md) |

#### Returns

`Promise`<\{ `checkpointValid`: `boolean` ; `failures?`: `any`[] ; `ready`: `boolean`  }\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:43

___

### updateLocalTarget

▸ **updateLocalTarget**(`cb`): `Promise`<`boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | () => `Promise`<`string`\> |

#### Returns

`Promise`<`boolean`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/BucketStorageAdapter.d.ts:51
