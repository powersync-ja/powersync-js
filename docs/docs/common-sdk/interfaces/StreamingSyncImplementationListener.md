---
id: "StreamingSyncImplementationListener"
title: "Interface: StreamingSyncImplementationListener"
sidebar_label: "StreamingSyncImplementationListener"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`BaseListener`](../modules.md#baselistener)

  ↳ **`StreamingSyncImplementationListener`**

  ↳↳ [`PowerSyncDBListener`](PowerSyncDBListener.md)

## Properties

### statusChanged

• `Optional` **statusChanged**: (`status`: [`SyncStatus`](../classes/SyncStatus.md)) => `void`

#### Type declaration

▸ (`status`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `status` | [`SyncStatus`](../classes/SyncStatus.md) |

##### Returns

`void`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:43](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L43)
