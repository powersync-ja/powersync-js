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

powersync-sdk-common/lib/client/sync/bucket/CrudTransaction.d.ts:7

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

#### Overrides

[CrudBatch](CrudBatch.md).[complete](CrudBatch.md#complete)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudTransaction.d.ts:5

___

### crud

• **crud**: [`CrudEntry`](CrudEntry.md)[]

#### Overrides

[CrudBatch](CrudBatch.md).[crud](CrudBatch.md#crud)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudTransaction.d.ts:4

___

### haveMore

• **haveMore**: `boolean`

#### Inherited from

[CrudBatch](CrudBatch.md).[haveMore](CrudBatch.md#havemore)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudBatch.d.ts:4

___

### transactionId

• `Optional` **transactionId**: `number`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudTransaction.d.ts:6
