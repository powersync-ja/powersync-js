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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:19

___

### limit

• `Optional` **limit**: `number`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:30

___

### request\_checkpoint

• **request\_checkpoint**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `include_checksum` | `boolean` | Whether or not to compute a checksum. |
| `include_data` | `boolean` | Whether or not to include an initial data request. |

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:20
