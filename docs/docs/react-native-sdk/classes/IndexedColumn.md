---
id: "IndexedColumn"
title: "Class: IndexedColumn"
sidebar_label: "IndexedColumn"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new IndexedColumn**(`options`): [`IndexedColumn`](IndexedColumn.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`IndexColumnOptions`](../interfaces/IndexColumnOptions.md) |

#### Returns

[`IndexedColumn`](IndexedColumn.md)

#### Defined in

powersync-sdk-common/lib/db/schema/IndexedColumn.d.ts:11

## Properties

### options

• `Protected` **options**: [`IndexColumnOptions`](../interfaces/IndexColumnOptions.md)

#### Defined in

powersync-sdk-common/lib/db/schema/IndexedColumn.d.ts:9

## Accessors

### ascending

• `get` **ascending**(): `boolean`

#### Returns

`boolean`

#### Defined in

powersync-sdk-common/lib/db/schema/IndexedColumn.d.ts:13

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

powersync-sdk-common/lib/db/schema/IndexedColumn.d.ts:12

## Methods

### toJSON

▸ **toJSON**(`table`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `table` | [`Table`](Table.md) |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `ascending` | `boolean` |
| `name` | `string` |
| `type` | [`ColumnType`](../enums/ColumnType.md) |

#### Defined in

powersync-sdk-common/lib/db/schema/IndexedColumn.d.ts:14

___

### createAscending

▸ **createAscending**(`column`): [`IndexedColumn`](IndexedColumn.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `column` | `string` |

#### Returns

[`IndexedColumn`](IndexedColumn.md)

#### Defined in

powersync-sdk-common/lib/db/schema/IndexedColumn.d.ts:10
