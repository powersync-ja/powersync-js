---
id: "CrudResponse"
title: "Interface: CrudResponse"
sidebar_label: "CrudResponse"
sidebar_position: 0
custom_edit_url: null
---

## Properties

### checkpoint

• `Optional` **checkpoint**: `string`

A sync response with a checkpoint >= this checkpoint would contain all the changes in this request.

Any earlier checkpoint may or may not contain these changes.

May be empty when the request contains no ops.

#### Defined in

[client/sync/stream/streaming-sync-types.ts:170](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/streaming-sync-types.ts#L170)
