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

[client/sync/stream/streaming-sync-types.ts:85](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L85)
