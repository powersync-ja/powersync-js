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

[client/sync/stream/streaming-sync-types.ts:55](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L55)

___

### checkpoint\_token

• `Optional` **checkpoint\_token**: `string`

#### Defined in

[client/sync/stream/streaming-sync-types.ts:53](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L53)

___

### data

• `Optional` **data**: [`SyncDataBucketJSON`](../modules.md#syncdatabucketjson)[]

Data for the buckets returned. May not have an an entry for each bucket in the request.

#### Defined in

[client/sync/stream/streaming-sync-types.ts:46](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L46)

___

### has\_more

• **has\_more**: `boolean`

True if the response limit has been reached, and another request must be made.

#### Defined in

[client/sync/stream/streaming-sync-types.ts:51](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L51)
