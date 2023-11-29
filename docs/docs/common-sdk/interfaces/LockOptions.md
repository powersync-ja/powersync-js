---
id: "LockOptions"
title: "Interface: LockOptions<T>"
sidebar_label: "LockOptions"
sidebar_position: 0
custom_edit_url: null
---

Abstract Lock to be implemented by various JS environments

## Type parameters

| Name |
| :------ |
| `T` |

## Properties

### callback

• **callback**: () => `Promise`<`T`\>

#### Type declaration

▸ (): `Promise`<`T`\>

##### Returns

`Promise`<`T`\>

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:29](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L29)

___

### signal

• `Optional` **signal**: `AbortSignal`

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:31](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L31)

___

### type

• **type**: [`LockType`](../enums/LockType.md)

#### Defined in

[client/sync/stream/AbstractStreamingSyncImplementation.ts:30](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/stream/AbstractStreamingSyncImplementation.ts#L30)
