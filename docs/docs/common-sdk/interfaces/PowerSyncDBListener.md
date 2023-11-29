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

[client/AbstractPowerSyncDatabase.ts:39](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/AbstractPowerSyncDatabase.ts#L39)

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

[client/sync/stream/AbstractStreamingSyncImplementation.ts:43](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L43)
