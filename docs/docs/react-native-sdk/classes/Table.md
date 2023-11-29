---
id: "Table"
title: "Class: Table"
sidebar_label: "Table"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new Table**(`options`): [`Table`](Table.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TableOptions`](../interfaces/TableOptions.md) |

#### Returns

[`Table`](Table.md)

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:15

## Properties

### options

• `Protected` **options**: [`TableOptions`](../interfaces/TableOptions.md)

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:12

## Accessors

### columns

• `get` **columns**(): [`Column`](Column.md)[]

#### Returns

[`Column`](Column.md)[]

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:17

___

### indexes

• `get` **indexes**(): [`Index`](Index.md)[]

#### Returns

[`Index`](Index.md)[]

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:18

___

### insertOnly

• `get` **insertOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:20

___

### internalName

• `get` **internalName**(): `string`

#### Returns

`string`

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:21

___

### localOnly

• `get` **localOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:19

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:16

___

### validName

• `get` **validName**(): `boolean`

#### Returns

`boolean`

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:22

## Methods

### toJSON

▸ **toJSON**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `columns` | \{ `name`: `string` ; `type`: [`ColumnType`](../enums/ColumnType.md)  }[] |
| `indexes` | \{ `columns`: \{ `ascending`: `boolean` ; `name`: `string` ; `type`: [`ColumnType`](../enums/ColumnType.md)  }[] ; `name`: `string`  }[] |
| `insert_only` | `boolean` |
| `local_only` | `boolean` |
| `name` | `string` |

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:23

___

### createInsertOnly

▸ **createInsertOnly**(`options`): [`Table`](Table.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TableOptions`](../interfaces/TableOptions.md) |

#### Returns

[`Table`](Table.md)

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:14

___

### createLocalOnly

▸ **createLocalOnly**(`options`): [`Table`](Table.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`TableOptions`](../interfaces/TableOptions.md) |

#### Returns

[`Table`](Table.md)

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:13
