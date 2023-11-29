---
id: "DBAdapter"
title: "Interface: DBAdapter"
sidebar_label: "DBAdapter"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- [`BaseObserverInterface`](BaseObserverInterface.md)<[`DBAdapterListener`](DBAdapterListener.md)\>

- [`DBGetUtils`](DBGetUtils.md)

  ↳ **`DBAdapter`**

## Implemented by

- [`RNQSDBAdapter`](../classes/RNQSDBAdapter.md)

## Properties

### close

• **close**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:63

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

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:68

___

### readLock

• **readLock**: <T\>(`fn`: (`tx`: [`LockContext`](LockContext.md)) => `Promise`<`T`\>, `options?`: [`DBLockOptions`](DBLockOptions.md)) => `Promise`<`T`\>

#### Type declaration

▸ <`T`\>(`fn`, `options?`): `Promise`<`T`\>

##### Type parameters

| Name |
| :------ |
| `T` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`tx`: [`LockContext`](LockContext.md)) => `Promise`<`T`\> |
| `options?` | [`DBLockOptions`](DBLockOptions.md) |

##### Returns

`Promise`<`T`\>

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:64

___

### readTransaction

• **readTransaction**: <T\>(`fn`: (`tx`: [`Transaction`](Transaction.md)) => `Promise`<`T`\>, `options?`: [`DBLockOptions`](DBLockOptions.md)) => `Promise`<`T`\>

#### Type declaration

▸ <`T`\>(`fn`, `options?`): `Promise`<`T`\>

##### Type parameters

| Name |
| :------ |
| `T` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`tx`: [`Transaction`](Transaction.md)) => `Promise`<`T`\> |
| `options?` | [`DBLockOptions`](DBLockOptions.md) |

##### Returns

`Promise`<`T`\>

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:65

___

### writeLock

• **writeLock**: <T\>(`fn`: (`tx`: [`LockContext`](LockContext.md)) => `Promise`<`T`\>, `options?`: [`DBLockOptions`](DBLockOptions.md)) => `Promise`<`T`\>

#### Type declaration

▸ <`T`\>(`fn`, `options?`): `Promise`<`T`\>

##### Type parameters

| Name |
| :------ |
| `T` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`tx`: [`LockContext`](LockContext.md)) => `Promise`<`T`\> |
| `options?` | [`DBLockOptions`](DBLockOptions.md) |

##### Returns

`Promise`<`T`\>

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:66

___

### writeTransaction

• **writeTransaction**: <T\>(`fn`: (`tx`: [`Transaction`](Transaction.md)) => `Promise`<`T`\>, `options?`: [`DBLockOptions`](DBLockOptions.md)) => `Promise`<`T`\>

#### Type declaration

▸ <`T`\>(`fn`, `options?`): `Promise`<`T`\>

##### Type parameters

| Name |
| :------ |
| `T` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`tx`: [`Transaction`](Transaction.md)) => `Promise`<`T`\> |
| `options?` | [`DBLockOptions`](DBLockOptions.md) |

##### Returns

`Promise`<`T`\>

#### Defined in

powersync-sdk-common/lib/db/DBAdapter.d.ts:67

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

___

### registerListener

▸ **registerListener**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | `Partial`<[`DBAdapterListener`](DBAdapterListener.md)\> |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Inherited from

[BaseObserverInterface](BaseObserverInterface.md).[registerListener](BaseObserverInterface.md#registerlistener)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:2
