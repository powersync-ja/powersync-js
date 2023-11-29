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

powersync-sdk-common/lib/client/sync/stream/streaming-sync-types.d.ts:115
