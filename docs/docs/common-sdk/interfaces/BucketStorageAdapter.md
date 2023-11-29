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

[client/sync/bucket/BucketStorageAdapter.ts:60](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L60)

___

### forceCompact

▸ **forceCompact**(): `Promise`<`void`\>

Exposed for tests only.

#### Returns

`Promise`<`void`\>

#### Defined in

[client/sync/bucket/BucketStorageAdapter.ts:65](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L65)

___

### getBucketStates

▸ **getBucketStates**(): `Promise`<[`BucketState`](BucketState.md)[]\>

#### Returns

`Promise`<[`BucketState`](BucketState.md)[]\>

#### Defined in

[client/sync/bucket/BucketStorageAdapter.ts:48](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L48)

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

[client/sync/bucket/BucketStorageAdapter.ts:53](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L53)

___

### getMaxOpId

▸ **getMaxOpId**(): `string`

#### Returns

`string`

#### Defined in

[client/sync/bucket/BucketStorageAdapter.ts:67](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L67)

___

### hasCompletedSync

▸ **hasCompletedSync**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[client/sync/bucket/BucketStorageAdapter.ts:55](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L55)

___

### hasCrud

▸ **hasCrud**(): `Promise`<`boolean`\>

#### Returns

`Promise`<`boolean`\>

#### Defined in

[client/sync/bucket/BucketStorageAdapter.ts:52](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L52)

___

### init

▸ **init**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[client/sync/bucket/BucketStorageAdapter.ts:41](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L41)

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

[client/sync/bucket/BucketStorageAdapter.ts:43](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L43)

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

[client/sync/bucket/BucketStorageAdapter.ts:42](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L42)

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

[client/sync/bucket/BucketStorageAdapter.ts:44](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L44)

___

### startSession

▸ **startSession**(): `void`

#### Returns

`void`

#### Defined in

[client/sync/bucket/BucketStorageAdapter.ts:46](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L46)

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

[client/sync/bucket/BucketStorageAdapter.ts:50](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L50)

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

[client/sync/bucket/BucketStorageAdapter.ts:56](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/BucketStorageAdapter.ts#L56)
