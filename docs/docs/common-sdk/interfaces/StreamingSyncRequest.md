---
id: "StreamingSyncRequest"
title: "Interface: StreamingSyncRequest"
sidebar_label: "StreamingSyncRequest"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### buckets

• `Optional` **buckets**: [`BucketRequest`](BucketRequest.md)[]

Existing bucket states.

#### Defined in

[client/sync/stream/streaming-sync-types.ts:62](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L62)

___

### include\_checksum

• **include\_checksum**: `boolean`

Whether or not to compute a checksum for each checkpoint

#### Defined in

[client/sync/stream/streaming-sync-types.ts:72](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L72)

___

### only

• `Optional` **only**: `string`[]

If specified, limit the response to only include these buckets.

#### Defined in

[client/sync/stream/streaming-sync-types.ts:67](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L67)

___

### raw\_data

• **raw\_data**: `boolean`

Changes the response to stringified data in each OplogEntry

#### Defined in

[client/sync/stream/streaming-sync-types.ts:77](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L77)
