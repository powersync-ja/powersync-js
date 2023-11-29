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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:49

___

### include\_checksum

• **include\_checksum**: `boolean`

Whether or not to compute a checksum for each checkpoint

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:57

___

### only

• `Optional` **only**: `string`[]

If specified, limit the response to only include these buckets.

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:53

___

### raw\_data

• **raw\_data**: `boolean`

Changes the response to stringified data in each OplogEntry

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:61
