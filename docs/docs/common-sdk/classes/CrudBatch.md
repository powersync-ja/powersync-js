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

[client/sync/bucket/CrudBatch.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudBatch.ts#L4)

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

[client/sync/bucket/CrudBatch.ts:7](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudBatch.ts#L7)

___

### crud

• **crud**: [`CrudEntry`](CrudEntry.md)[]

#### Defined in

[client/sync/bucket/CrudBatch.ts:5](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudBatch.ts#L5)

___

### haveMore

• **haveMore**: `boolean`

#### Defined in

[client/sync/bucket/CrudBatch.ts:6](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudBatch.ts#L6)
