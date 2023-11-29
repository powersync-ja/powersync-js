---
id: "SyncResponse"
title: "Interface: SyncResponse"
sidebar_label: "SyncResponse"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### checkpoint

• `Optional` **checkpoint**: [`Checkpoint`](Checkpoint.md)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:43

___

### checkpoint\_token

• `Optional` **checkpoint\_token**: `string`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:42

___

### data

• `Optional` **data**: [`SyncDataBucketJSON`](../modules.md#syncdatabucketjson)[]

Data for the buckets returned. May not have an an entry for each bucket in the request.

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:37

___

### has\_more

• **has\_more**: `boolean`

True if the response limit has been reached, and another request must be made.

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:41
