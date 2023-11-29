---
id: "Transaction"
title: "Interface: Transaction"
sidebar_label: "Transaction"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`LockContext`](LockContext.md)

  ↳ **`Transaction`**

## Properties

### commit

• **commit**: () => `Promise`<[`QueryResult`](QueryResult.md)\>

#### Type declaration

▸ (): `Promise`<[`QueryResult`](QueryResult.md)\>

##### Returns

`Promise`<[`QueryResult`](QueryResult.md)\>

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:40

___

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

#### Inherited from

[LockContext](LockContext.md).[execute](LockContext.md#execute)

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:37

___

### rollback

• **rollback**: () => `Promise`<[`QueryResult`](QueryResult.md)\>

#### Type declaration

▸ (): `Promise`<[`QueryResult`](QueryResult.md)\>

##### Returns

`Promise`<[`QueryResult`](QueryResult.md)\>

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:41

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

[LockContext](LockContext.md).[get](LockContext.md#get)

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

[LockContext](LockContext.md).[getAll](LockContext.md#getall)

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

[LockContext](LockContext.md).[getOptional](LockContext.md#getoptional)

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:33
