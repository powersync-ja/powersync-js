---
id: "CrudTransaction"
title: "Class: CrudTransaction"
sidebar_label: "CrudTransaction"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`CrudBatch`](CrudBatch.md)

  ↳ **`CrudTransaction`**

## Constructors

### constructor

• **new CrudTransaction**(`crud`, `complete`, `transactionId?`): [`CrudTransaction`](CrudTransaction.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `crud` | [`CrudEntry`](CrudEntry.md)[] |
| `complete` | (`checkpoint?`: `string`) => `Promise`<`void`\> |
| `transactionId?` | `number` |

#### Returns

[`CrudTransaction`](CrudTransaction.md)

#### Overrides

[CrudBatch](CrudBatch.md).[constructor](CrudBatch.md#constructor)

#### Defined in

[client/sync/bucket/CrudTransaction.ts:5](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudTransaction.ts#L5)

## Properties

### complete

• **complete**: (`checkpoint?`: `string`) => `Promise`<`void`\>

#### Type declaration

▸ (`checkpoint?`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `checkpoint?` | `string` |

##### Returns

`Promise`<`void`\>

#### Inherited from

[CrudBatch](CrudBatch.md).[complete](CrudBatch.md#complete)

#### Defined in

[client/sync/bucket/CrudTransaction.ts:7](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudTransaction.ts#L7)

___

### crud

• **crud**: [`CrudEntry`](CrudEntry.md)[]

#### Inherited from

[CrudBatch](CrudBatch.md).[crud](CrudBatch.md#crud)

#### Defined in

[client/sync/bucket/CrudTransaction.ts:6](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudTransaction.ts#L6)

___

### haveMore

• **haveMore**: `boolean`

#### Inherited from

[CrudBatch](CrudBatch.md).[haveMore](CrudBatch.md#havemore)

#### Defined in

[client/sync/bucket/CrudBatch.ts:6](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudBatch.ts#L6)

___

### transactionId

• `Optional` **transactionId**: `number`

#### Defined in

[client/sync/bucket/CrudTransaction.ts:8](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudTransaction.ts#L8)
