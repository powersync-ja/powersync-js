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

## Properties

### close

• **close**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

[db/DBAdapter.ts:72](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L72)

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

[db/DBAdapter.ts:77](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L77)

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

[db/DBAdapter.ts:73](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L73)

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

[db/DBAdapter.ts:74](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L74)

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

[db/DBAdapter.ts:75](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L75)

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

[db/DBAdapter.ts:76](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L76)

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

[DBGetUtils](DBGetUtils.md).[getAll](DBGetUtils.md#getall)

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

[DBGetUtils](DBGetUtils.md).[getOptional](DBGetUtils.md#getoptional)

#### Defined in

[db/DBAdapter.ts:36](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/db/DBAdapter.ts#L36)

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

[utils/BaseObserver.ts:4](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-common/src/utils/BaseObserver.ts#L4)
