---
id: "QueryResult"
title: "Interface: QueryResult"
sidebar_label: "QueryResult"
sidebar_position: 0
custom_edit_url: null
---

Object returned by SQL Query executions {
 insertId: Represent the auto-generated row id if applicable
 rowsAffected: Number of affected rows if result of a update query
 message: if status === 1, here you will find error description
 rows: if status is undefined or 0 this object will contain the query results
}

 QueryResult

## Properties

### insertId

• `Optional` **insertId**: `number`

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:17

___

### rows

• `Optional` **rows**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `_array` | `any`[] | Raw array with all dataset |
| `item` | (`idx`: `number`) => `any` | A convenience function to acess the index based the row object |
| `length` | `number` | The length of the dataset |

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:19

___

### rowsAffected

• **rowsAffected**: `number`

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:18
