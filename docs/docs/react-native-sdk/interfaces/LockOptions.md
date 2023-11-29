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

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:16

___

### signal

• `Optional` **signal**: `AbortSignal`

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:18

___

### type

• **type**: [`LockType`](../enums/LockType.md)

#### Defined in

powersync-sdk-common/lib/client/sync/stream/AbstractStreamingSyncImplementation.d.ts:17
