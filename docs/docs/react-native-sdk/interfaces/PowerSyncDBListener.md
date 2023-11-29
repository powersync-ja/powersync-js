---
id: "PowerSyncDBListener"
title: "Interface: PowerSyncDBListener"
sidebar_label: "PowerSyncDBListener"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`StreamingSyncImplementationListener`](StreamingSyncImplementationListener.md)

  ↳ **`PowerSyncDBListener`**

## Properties

### initialized

• **initialized**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

powersync-sdk-common/lib/client/AbstractPowerSyncDatabase.d.ts:29

___

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

#### Inherited from

[StreamingSyncImplementationListener](StreamingSyncImplementationListener.md).[statusChanged](StreamingSyncImplementationListener.md#statuschanged)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:28
