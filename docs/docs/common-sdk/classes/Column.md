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

[db/Column.ts:14](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/Column.ts#L14)

## Properties

### options

• `Protected` **options**: [`ColumnOptions`](../interfaces/ColumnOptions.md)

#### Defined in

[db/Column.ts:14](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/Column.ts#L14)

## Accessors

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

[db/Column.ts:16](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/Column.ts#L16)

___

### type

• `get` **type**(): [`ColumnType`](../enums/ColumnType.md)

#### Returns

[`ColumnType`](../enums/ColumnType.md)

#### Defined in

[db/Column.ts:20](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/Column.ts#L20)

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

[db/Column.ts:24](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/Column.ts#L24)
