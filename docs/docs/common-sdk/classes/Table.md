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

[db/schema/Table.ts:29](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L29)

## Properties

### options

• `Protected` **options**: [`TableOptions`](../interfaces/TableOptions.md)

#### Defined in

[db/schema/Table.ts:19](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L19)

## Accessors

### columns

• `get` **columns**(): [`Column`](Column.md)[]

#### Returns

[`Column`](Column.md)[]

#### Defined in

[db/schema/Table.ts:37](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L37)

___

### indexes

• `get` **indexes**(): [`Index`](Index.md)[]

#### Returns

[`Index`](Index.md)[]

#### Defined in

[db/schema/Table.ts:41](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L41)

___

### insertOnly

• `get` **insertOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[db/schema/Table.ts:49](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L49)

___

### internalName

• `get` **internalName**(): `string`

#### Returns

`string`

#### Defined in

[db/schema/Table.ts:53](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L53)

___

### localOnly

• `get` **localOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[db/schema/Table.ts:45](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L45)

___

### name

• `get` **name**(): `string`

#### Returns

`string`

#### Defined in

[db/schema/Table.ts:33](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L33)

___

### validName

• `get` **validName**(): `boolean`

#### Returns

`boolean`

#### Defined in

[db/schema/Table.ts:61](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L61)

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

[db/schema/Table.ts:66](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L66)

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

[db/schema/Table.ts:25](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L25)

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

[db/schema/Table.ts:21](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Table.ts#L21)
