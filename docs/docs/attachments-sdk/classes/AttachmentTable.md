---
id: "AttachmentTable"
title: "Class: AttachmentTable"
sidebar_label: "AttachmentTable"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `Table`

  ↳ **`AttachmentTable`**

## Constructors

### constructor

• **new AttachmentTable**(`options?`): [`AttachmentTable`](AttachmentTable.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | [`AttachmentTableOptions`](../interfaces/AttachmentTableOptions.md) |

#### Returns

[`AttachmentTable`](AttachmentTable.md)

#### Overrides

Table.constructor

#### Defined in

[powersync-attachments/src/Schema.ts:29](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-attachments/src/Schema.ts#L29)

## Properties

### options

• `Protected` **options**: `TableOptions`

#### Inherited from

Table.options

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:12

## Accessors

### columns

• `get` **columns**(): `Column`[]

#### Returns

`Column`[]

#### Inherited from

Table.columns

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:17

___

### indexes

• `get` **indexes**(): `Index`[]

#### Returns

`Index`[]

#### Inherited from

Table.indexes

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:18

___

### insertOnly

• `get` **insertOnly**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Table.insertOnly

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:20

___

### internalName

• `get` **internalName**(): `string`

#### Returns

`string`

#### Inherited from

Table.internalName

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:21

___

### localOnly

• `get` **localOnly**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Table.localOnly

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:19

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Inherited from

Table.name

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:16

___

### validName

• `get` **validName**(): `boolean`

#### Returns

`boolean`

#### Inherited from

Table.validName

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:22

## Methods

### toJSON

▸ **toJSON**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `columns` | \{ `name`: `string` ; `type`: `ColumnType`  }[] |
| `indexes` | \{ `columns`: \{ `ascending`: `boolean` ; `name`: `string` ; `type`: `ColumnType`  }[] ; `name`: `string`  }[] |
| `insert_only` | `boolean` |
| `local_only` | `boolean` |
| `name` | `string` |

#### Inherited from

Table.toJSON

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:23

___

### createInsertOnly

▸ **createInsertOnly**(`options`): `Table`

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `TableOptions` |

#### Returns

`Table`

#### Inherited from

Table.createInsertOnly

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:14

___

### createLocalOnly

▸ **createLocalOnly**(`options`): `Table`

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `TableOptions` |

#### Returns

`Table`

#### Inherited from

Table.createLocalOnly

#### Defined in

powersync-sdk-common/lib/db/schema/Table.d.ts:13
