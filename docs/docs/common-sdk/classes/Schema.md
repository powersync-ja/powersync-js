---
id: "Schema"
title: "Class: Schema"
sidebar_label: "Schema"
sidebar_position: 0
custom_edit_url: null
---

## Constructors

### constructor

• **new Schema**(`tables`): [`Schema`](Schema.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `tables` | [`Table`](Table.md)[] |

#### Returns

[`Schema`](Schema.md)

#### Defined in

[db/schema/Schema.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Schema.ts#L4)

## Properties

### tables

• **tables**: [`Table`](Table.md)[]

#### Defined in

[db/schema/Schema.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Schema.ts#L4)

## Methods

### toJSON

▸ **toJSON**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `tables` | \{ `columns`: \{ `name`: `string` ; `type`: [`ColumnType`](../enums/ColumnType.md)  }[] ; `indexes`: \{ `columns`: \{ `ascending`: `boolean` ; `name`: `string` ; `type`: [`ColumnType`](../enums/ColumnType.md)  }[] ; `name`: `string`  }[] ; `insert_only`: `boolean` ; `local_only`: `boolean` ; `name`: `string`  }[] |

#### Defined in

[db/schema/Schema.ts:6](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/schema/Schema.ts#L6)
