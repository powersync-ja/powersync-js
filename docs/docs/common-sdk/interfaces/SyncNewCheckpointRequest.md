---
id: "SyncNewCheckpointRequest"
title: "Interface: SyncNewCheckpointRequest"
sidebar_label: "SyncNewCheckpointRequest"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### buckets

• `Optional` **buckets**: [`BucketRequest`](BucketRequest.md)[]

Existing bucket states. Used if include_data is specified.

#### Defined in

[client/sync/stream/streaming-sync-types.ts:23](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L23)

___

### limit

• `Optional` **limit**: `number`

#### Defined in

[client/sync/stream/streaming-sync-types.ts:37](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L37)

___

### request\_checkpoint

• **request\_checkpoint**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `include_checksum` | `boolean` | Whether or not to compute a checksum. |
| `include_data` | `boolean` | Whether or not to include an initial data request. |

#### Defined in

[client/sync/stream/streaming-sync-types.ts:25](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L25)
