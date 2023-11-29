---
id: "Index"
title: "Class: Index"
sidebar_label: "Index"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new Index**(`options`): [`Index`](Index.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`IndexOptions`](../interfaces/IndexOptions.md) |

#### Returns

[`Index`](Index.md)

#### Defined in

[db/schema/Index.ts:21](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Index.ts#L21)

## Properties

### options

• `Protected` **options**: [`IndexOptions`](../interfaces/IndexOptions.md)

#### Defined in

[db/schema/Index.ts:21](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Index.ts#L21)

## Accessors

### columns

• `get` **columns**(): [`IndexedColumn`](IndexedColumn.md)[]

#### Returns

[`IndexedColumn`](IndexedColumn.md)[]

#### Defined in

[db/schema/Index.ts:29](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Index.ts#L29)

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

[db/schema/Index.ts:25](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Index.ts#L25)

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
| `columns` | \{ `ascending`: `boolean` ; `name`: `string` ; `type`: [`ColumnType`](../enums/ColumnType.md)  }[] |
| `name` | `string` |

#### Defined in

[db/schema/Index.ts:33](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Index.ts#L33)

___

### createAscending

▸ **createAscending**(`options`, `columnNames`): [`Index`](Index.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`IndexOptions`](../interfaces/IndexOptions.md) |
| `columnNames` | `string`[] |

#### Returns

[`Index`](Index.md)

#### Defined in

[db/schema/Index.ts:14](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Index.ts#L14)
