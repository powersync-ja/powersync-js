---
id: "SyncDataBucket"
title: "Class: SyncDataBucket"
sidebar_label: "SyncDataBucket"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new SyncDataBucket**(`bucket`, `data`, `has_more`, `after`, `next_after`): [`SyncDataBucket`](SyncDataBucket.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `bucket` | `string` | - |
| `data` | `OplogEntry`[] | - |
| `has_more` | `boolean` | True if the response does not contain all the data for this bucket, and another request must be made. |
| `after` | `string` | The `after` specified in the request. |
| `next_after` | `string` | Use this for the next request. |

#### Returns

[`SyncDataBucket`](SyncDataBucket.md)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:27

## Properties

### after

• **after**: `string`

The `after` specified in the request.

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:21

___

### bucket

• **bucket**: `string`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:12

___

### data

• **data**: `OplogEntry`[]

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:13

___

### has\_more

• **has\_more**: `boolean`

True if the response does not contain all the data for this bucket, and another request must be made.

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:17

___

### next\_after

• **next\_after**: `string`

Use this for the next request.

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:25

## Methods

### toJSON

▸ **toJSON**(): [`SyncDataBucketJSON`](../modules.md#syncdatabucketjson)

#### Returns

[`SyncDataBucketJSON`](../modules.md#syncdatabucketjson)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:40

___

### fromRow

▸ **fromRow**(`row`): [`SyncDataBucket`](SyncDataBucket.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `row` | [`SyncDataBucketJSON`](../modules.md#syncdatabucketjson) |

#### Returns

[`SyncDataBucket`](SyncDataBucket.md)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/SyncDataBucket.d.ts:26
