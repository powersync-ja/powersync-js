---
id: "RNQSDBAdapter"
title: "Class: RNQSDBAdapter"
sidebar_label: "RNQSDBAdapter"
sidebar_position: 0
custom_edit_url: null
---

Adapter for React Native Quick SQLite

## Hierarchy

- [`BaseObserver`](BaseObserver.md)<[`DBAdapterListener`](../interfaces/DBAdapterListener.md)\>

  ↳ **`RNQSDBAdapter`**

## Implements

- [`DBAdapter`](../interfaces/DBAdapter.md)

## Constructors

### constructor

• **new RNQSDBAdapter**(`baseDB`): [`RNQSDBAdapter`](RNQSDBAdapter.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `baseDB` | `QuickSQLiteConnection` |

#### Returns

[`RNQSDBAdapter`](RNQSDBAdapter.md)

#### Overrides

[BaseObserver](BaseObserver.md).[constructor](BaseObserver.md#constructor)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:21](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L21)

## Properties

### baseDB

• `Protected` **baseDB**: `QuickSQLiteConnection`

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:21](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L21)

___

### get

• **get**: <T\>(`sql`: `string`, `parameters?`: `any`[]) => `Promise`<`T`\>

#### Type declaration

▸ <`T`\>(`sql`, `parameters?`): `Promise`<`T`\>

##### Type parameters

| Name |
| :------ |
| `T` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

##### Returns

`Promise`<`T`\>

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[get](../interfaces/DBAdapter.md#get)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:19](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L19)

___

### getAll

• **getAll**: <T\>(`sql`: `string`, `parameters?`: `any`[]) => `Promise`<`T`[]\>

#### Type declaration

▸ <`T`\>(`sql`, `parameters?`): `Promise`<`T`[]\>

##### Type parameters

| Name |
| :------ |
| `T` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

##### Returns

`Promise`<`T`[]\>

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[getAll](../interfaces/DBAdapter.md#getall)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:17](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L17)

___

### getOptional

• **getOptional**: <T\>(`sql`: `string`, `parameters?`: `any`[]) => `Promise`<`T`\>

#### Type declaration

▸ <`T`\>(`sql`, `parameters?`): `Promise`<`T`\>

##### Type parameters

| Name |
| :------ |
| `T` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `parameters?` | `any`[] |

##### Returns

`Promise`<`T`\>

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[getOptional](../interfaces/DBAdapter.md#getoptional)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:18](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L18)

___

### listeners

• `Protected` **listeners**: `Object`

#### Index signature

▪ [id: `string`]: `Partial`<`T`\>

#### Inherited from

[BaseObserver](BaseObserver.md).[listeners](BaseObserver.md#listeners)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:8

## Methods

### close

▸ **close**(): `void`

#### Returns

`void`

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[close](../interfaces/DBAdapter.md#close)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:38](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L38)

___

### execute

▸ **execute**(`query`, `params?`): `Promise`<`QueryResult`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `query` | `string` |
| `params?` | `any`[] |

#### Returns

`Promise`<`QueryResult`\>

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[execute](../interfaces/DBAdapter.md#execute)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:58](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L58)

___

### generateDBHelpers

▸ **generateDBHelpers**<`T`\>(`tx`): `T` & [`DBGetUtils`](../interfaces/DBGetUtils.md)

Adds DB get utils to lock contexts and transaction contexts

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Object` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `tx` | `T` |

#### Returns

`T` & [`DBGetUtils`](../interfaces/DBGetUtils.md)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:77](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L77)

___

### iterateListeners

▸ **iterateListeners**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`listener`: `Partial`<[`DBAdapterListener`](../interfaces/DBAdapterListener.md)\>) => `any` |

#### Returns

`void`

#### Inherited from

[BaseObserver](BaseObserver.md).[iterateListeners](BaseObserver.md#iteratelisteners)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:13

___

### readLock

▸ **readLock**<`T`\>(`fn`, `options?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`tx`: [`LockContext`](../interfaces/LockContext.md)) => `Promise`<`T`\> |
| `options?` | [`DBLockOptions`](../interfaces/DBLockOptions.md) |

#### Returns

`Promise`<`T`\>

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[readLock](../interfaces/DBAdapter.md#readlock)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:42](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L42)

___

### readOnlyExecute

▸ **readOnlyExecute**(`sql`, `params?`): `Promise`<`QueryResult`\>

This provides a top-level read only execute method which is executed inside a read-lock.
This is necessary since the high level `execute` method uses a write-lock under
the hood. Helper methods such as `get`, `getAll` and `getOptional` are read only,
and should use this method.

#### Parameters

| Name | Type |
| :------ | :------ |
| `sql` | `string` |
| `params?` | `any`[] |

#### Returns

`Promise`<`QueryResult`\>

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:68](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L68)

___

### readTransaction

▸ **readTransaction**<`T`\>(`fn`, `options?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`tx`: [`Transaction`](../interfaces/Transaction.md)) => `Promise`<`T`\> |
| `options?` | [`DBLockOptions`](../interfaces/DBLockOptions.md) |

#### Returns

`Promise`<`T`\>

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[readTransaction](../interfaces/DBAdapter.md#readtransaction)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:46](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L46)

___

### registerListener

▸ **registerListener**(`listener`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `listener` | `Partial`<[`DBAdapterListener`](../interfaces/DBAdapterListener.md)\> |

#### Returns

`fn`

▸ (): `void`

##### Returns

`void`

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[registerListener](../interfaces/DBAdapter.md#registerlistener)

#### Inherited from

[BaseObserver](BaseObserver.md).[registerListener](BaseObserver.md#registerlistener)

#### Defined in

powersync-sdk-common/lib/utils/BaseObserver.d.ts:12

___

### writeLock

▸ **writeLock**<`T`\>(`fn`, `options?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`tx`: [`LockContext`](../interfaces/LockContext.md)) => `Promise`<`T`\> |
| `options?` | [`DBLockOptions`](../interfaces/DBLockOptions.md) |

#### Returns

`Promise`<`T`\>

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[writeLock](../interfaces/DBAdapter.md#writelock)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:50](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L50)

___

### writeTransaction

▸ **writeTransaction**<`T`\>(`fn`, `options?`): `Promise`<`T`\>

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `fn` | (`tx`: [`Transaction`](../interfaces/Transaction.md)) => `Promise`<`T`\> |
| `options?` | [`DBLockOptions`](../interfaces/DBLockOptions.md) |

#### Returns

`Promise`<`T`\>

#### Implementation of

[DBAdapter](../interfaces/DBAdapter.md).[writeTransaction](../interfaces/DBAdapter.md#writetransaction)

#### Defined in

[powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts:54](https://github.com/powersync-ja/powersync-react-native-sdk/blob/65a3c12/packages/powersync-sdk-react-native/src/db/adapters/react-native-quick-sqlite/RNQSDBAdapter.ts#L54)
