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

powersync-sdk-common/lib/db/schema/Index.d.ts:11

## Properties

### options

• `Protected` **options**: [`IndexOptions`](../interfaces/IndexOptions.md)

#### Defined in

powersync-sdk-common/lib/db/schema/Index.d.ts:9

## Accessors

### columns

• `get` **columns**(): [`IndexedColumn`](IndexedColumn.md)[]

#### Returns

[`IndexedColumn`](IndexedColumn.md)[]

#### Defined in

powersync-sdk-common/lib/db/schema/Index.d.ts:13

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

powersync-sdk-common/lib/db/schema/Index.d.ts:12

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

powersync-sdk-common/lib/db/schema/Index.d.ts:14

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

powersync-sdk-common/lib/db/schema/Index.d.ts:10
