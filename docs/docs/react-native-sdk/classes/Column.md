---
id: "Column"
title: "Class: Column"
sidebar_label: "Column"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new Column**(`options`): [`Column`](Column.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ColumnOptions`](../interfaces/ColumnOptions.md) |

#### Returns

[`Column`](Column.md)

#### Defined in

powersync-sdk-common/lib/db/Column.d.ts:12

## Properties

### options

• `Protected` **options**: [`ColumnOptions`](../interfaces/ColumnOptions.md)

#### Defined in

powersync-sdk-common/lib/db/Column.d.ts:11

## Accessors

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

powersync-sdk-common/lib/db/Column.d.ts:13

___

### type

• `get` **type**(): [`ColumnType`](../enums/ColumnType.md)

#### Returns

[`ColumnType`](../enums/ColumnType.md)

#### Defined in

powersync-sdk-common/lib/db/Column.d.ts:14

## Methods

### toJSON

▸ **toJSON**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `name` | `string` |
| `type` | [`ColumnType`](../enums/ColumnType.md) |

#### Defined in

powersync-sdk-common/lib/db/Column.d.ts:15
