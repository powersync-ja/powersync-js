---
id: "StreamingSyncCheckpointDiff"
title: "Interface: StreamingSyncCheckpointDiff"
sidebar_label: "StreamingSyncCheckpointDiff"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### checkpoint\_diff

• **checkpoint\_diff**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `last_op_id` | `string` |
| `removed_buckets` | `string`[] |
| `updated_buckets` | [`BucketChecksum`](BucketChecksum.md)[] |
| `write_checkpoint` | `string` |

#### Defined in

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:67
