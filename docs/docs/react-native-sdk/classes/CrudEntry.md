---
id: "CrudEntry"
title: "Class: CrudEntry"
sidebar_label: "CrudEntry"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new CrudEntry**(`clientId`, `op`, `table`, `id`, `transactionId?`, `opData?`): [`CrudEntry`](CrudEntry.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `clientId` | `number` |
| `op` | [`UpdateType`](../enums/UpdateType.md) |
| `table` | `string` |
| `id` | `string` |
| `transactionId?` | `number` |
| `opData?` | `Record`<`string`, `any`\> |

#### Returns

[`CrudEntry`](CrudEntry.md)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:42

## Properties

### clientId

• **clientId**: `number`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:35

___

### id

• **id**: `string`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:36

___

### op

• **op**: [`UpdateType`](../enums/UpdateType.md)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:37

___

### opData

• `Optional` **opData**: `Record`<`string`, `any`\>

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:38

___

### table

• **table**: `string`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:39

___

### transactionId

• `Optional` **transactionId**: `number`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:40

## Methods

### hashCode

▸ **hashCode**(): `string`

#### Returns

`string`

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:44

___

### toJSON

▸ **toJSON**(): [`CrudEntryOutputJSON`](../modules.md#crudentryoutputjson)

#### Returns

[`CrudEntryOutputJSON`](../modules.md#crudentryoutputjson)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:43

___

### fromRow

▸ **fromRow**(`dbRow`): [`CrudEntry`](CrudEntry.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `dbRow` | [`CrudEntryJSON`](../modules.md#crudentryjson) |

#### Returns

[`CrudEntry`](CrudEntry.md)

#### Defined in

powersync-sdk-common/lib/client/sync/bucket/CrudEntry.d.ts:41
