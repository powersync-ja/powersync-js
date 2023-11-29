---
id: "LockContext"
title: "Interface: LockContext"
sidebar_label: "LockContext"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`DBGetUtils`](DBGetUtils.md)

  ↳ **`LockContext`**

  ↳↳ [`Transaction`](Transaction.md)

## Properties

### execute

• **execute**: (`query`: `string`, `params?`: `any`[]) => `Promise`<[`QueryResult`](QueryResult.md)\>

#### Type declaration

▸ (`query`, `params?`): `Promise`<[`QueryResult`](QueryResult.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `query` | `string` |
| `params?` | `any`[] |

##### Returns

`Promise`<[`QueryResult`](QueryResult.md)\>

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:37

## Methods

### get

▸ **get**<`T`\>(`sql`, `parameters?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

#### Returns

`Promise`<`T`\>

#### Inherited from

[DBGetUtils](DBGetUtils.md).[get](DBGetUtils.md#get)

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:34

___

### getAll

▸ **getAll**<`T`\>(`sql`, `parameters?`): `Promise`<`T`[]\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

#### Returns

`Promise`<`T`[]\>

#### Inherited from

[DBGetUtils](DBGetUtils.md).[getAll](DBGetUtils.md#getall)

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:32

___

### getOptional

▸ **getOptional**<`T`\>(`sql`, `parameters?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

#### Returns

`Promise`<`T`\>

#### Inherited from

[DBGetUtils](DBGetUtils.md).[getOptional](DBGetUtils.md#getoptional)

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:33
