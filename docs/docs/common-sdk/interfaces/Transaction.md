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

[db/DBAdapter.ts:45](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L45)

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

[db/DBAdapter.ts:41](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L41)

___

### rollback

• **rollback**: () => `Promise`<[`QueryResult`](QueryResult.md)\>

#### Type declaration

▸ (): `Promise`<[`QueryResult`](QueryResult.md)\>

##### Returns

`Promise`<[`QueryResult`](QueryResult.md)\>

#### Defined in

[db/DBAdapter.ts:46](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L46)

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

[db/DBAdapter.ts:37](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L37)

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

[db/DBAdapter.ts:35](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L35)

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

[db/DBAdapter.ts:36](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L36)
