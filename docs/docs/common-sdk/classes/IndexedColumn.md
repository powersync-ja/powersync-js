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

[db/schema/IndexedColumn.ts:23](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/IndexedColumn.ts#L23)

## Properties

### options

• `Protected` **options**: [`IndexColumnOptions`](../interfaces/IndexColumnOptions.md)

#### Defined in

[db/schema/IndexedColumn.ts:14](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/IndexedColumn.ts#L14)

## Accessors

### ascending

• `get` **ascending**(): `boolean`

#### Returns

`boolean`

#### Defined in

[db/schema/IndexedColumn.ts:31](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/IndexedColumn.ts#L31)

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

[db/schema/IndexedColumn.ts:27](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/IndexedColumn.ts#L27)

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

[db/schema/IndexedColumn.ts:35](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/IndexedColumn.ts#L35)

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

[db/schema/IndexedColumn.ts:16](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/IndexedColumn.ts#L16)
