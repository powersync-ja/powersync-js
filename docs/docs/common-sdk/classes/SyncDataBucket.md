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

[client/sync/bucket/SyncDataBucket.ts:25](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L25)

## Properties

### after

• **after**: `string`

The `after` specified in the request.

#### Defined in

[client/sync/bucket/SyncDataBucket.ts:35](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L35)

___

### bucket

• **bucket**: `string`

#### Defined in

[client/sync/bucket/SyncDataBucket.ts:26](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L26)

___

### data

• **data**: `OplogEntry`[]

#### Defined in

[client/sync/bucket/SyncDataBucket.ts:27](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L27)

___

### has\_more

• **has\_more**: `boolean`

True if the response does not contain all the data for this bucket, and another request must be made.

#### Defined in

[client/sync/bucket/SyncDataBucket.ts:31](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L31)

___

### next\_after

• **next\_after**: `string`

Use this for the next request.

#### Defined in

[client/sync/bucket/SyncDataBucket.ts:39](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L39)

## Methods

### toJSON

▸ **toJSON**(): [`SyncDataBucketJSON`](../modules.md#syncdatabucketjson)

#### Returns

[`SyncDataBucketJSON`](../modules.md#syncdatabucketjson)

#### Defined in

[client/sync/bucket/SyncDataBucket.ts:42](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L42)

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

[client/sync/bucket/SyncDataBucket.ts:15](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/SyncDataBucket.ts#L15)
