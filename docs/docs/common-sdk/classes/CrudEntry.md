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

[client/sync/bucket/CrudEntry.ts:54](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L54)

## Properties

### clientId

• **clientId**: `number`

#### Defined in

[client/sync/bucket/CrudEntry.ts:42](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L42)

___

### id

• **id**: `string`

#### Defined in

[client/sync/bucket/CrudEntry.ts:43](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L43)

___

### op

• **op**: [`UpdateType`](../enums/UpdateType.md)

#### Defined in

[client/sync/bucket/CrudEntry.ts:44](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L44)

___

### opData

• `Optional` **opData**: `Record`<`string`, `any`\>

#### Defined in

[client/sync/bucket/CrudEntry.ts:45](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L45)

___

### table

• **table**: `string`

#### Defined in

[client/sync/bucket/CrudEntry.ts:46](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L46)

___

### transactionId

• `Optional` **transactionId**: `number`

#### Defined in

[client/sync/bucket/CrudEntry.ts:47](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L47)

## Methods

### hashCode

▸ **hashCode**(): `string`

#### Returns

`string`

#### Defined in

[client/sync/bucket/CrudEntry.ts:81](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L81)

___

### toJSON

▸ **toJSON**(): [`CrudEntryOutputJSON`](../modules.md#crudentryoutputjson)

#### Returns

[`CrudEntryOutputJSON`](../modules.md#crudentryoutputjson)

#### Defined in

[client/sync/bucket/CrudEntry.ts:70](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L70)

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

[client/sync/bucket/CrudEntry.ts:49](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/client/sync/bucket/CrudEntry.ts#L49)
