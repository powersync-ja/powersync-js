---
id: "CrudBatch"
title: "Class: CrudBatch"
sidebar_label: "CrudBatch"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- **`CrudBatch`**

  ↳ [`CrudTransaction`](CrudTransaction.md)

## Constructors

### constructor

• **new CrudBatch**(`crud`, `haveMore`, `complete`): [`CrudBatch`](CrudBatch.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `crud` | [`CrudEntry`](CrudEntry.md)[] |
| `haveMore` | `boolean` |
| `complete` | (`writeCheckpoint?`: `string`) => `Promise`<`void`\> |

#### Returns

[`CrudBatch`](CrudBatch.md)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudBatch.d.ts:6

## Properties

### complete

• **complete**: (`writeCheckpoint?`: `string`) => `Promise`<`void`\>

#### Type declaration

▸ (`writeCheckpoint?`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `writeCheckpoint?` | `string` |

##### Returns

`Promise`<`void`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudBatch.d.ts:5

___

### crud

• **crud**: [`CrudEntry`](CrudEntry.md)[]

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudBatch.d.ts:3

___

### haveMore

• **haveMore**: `boolean`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudBatch.d.ts:4
